import { z } from "zod";
import User from "../models/User.js";
import { ADMIN_ROLES, normalizeRole } from "../utils/rbac.js";
import { normalizeEmail, normalizePhone } from "../utils/normalize.js";
import { writeAdminAudit } from "../utils/adminAudit.js";

const createSchema = z.object({
  fullName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().min(6),
  password: z.string().min(6),
  role: z.string().trim().min(2),
  isActive: z.boolean().optional(),
});

const updateSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  role: z.string().trim().min(2).optional(),
  isActive: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6),
});

const validAdminRole = (role) => ADMIN_ROLES.includes(normalizeRole(role));

export const adminUserController = {
  list: async (req, res) => {
    const users = await User.find({ role: { $in: ["admin", ...ADMIN_ROLES] } })
      .select("fullName email phone role isActive createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, data: users.map((u) => ({ ...u, role: normalizeRole(u.role) })) });
  },

  create: async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Validation failed", code: "VALIDATION_ERROR" });
    }
    const payload = parsed.data;
    const role = normalizeRole(payload.role);
    if (!validAdminRole(role)) {
      return res.status(400).json({ success: false, message: "Invalid admin role", code: "INVALID_ROLE" });
    }
    const email = normalizeEmail(payload.email);
    const phone = normalizePhone(payload.phone);
    const existing = await User.findOne({ $or: [{ email }, { phone }] }).lean();
    if (existing) {
      return res.status(409).json({ success: false, message: "Email or phone already exists", code: "DUPLICATE_USER" });
    }
    const user = await User.create({
      fullName: payload.fullName.trim(),
      email,
      phone,
      password: payload.password,
      role,
      isActive: payload.isActive ?? true,
    });
    await writeAdminAudit(req, {
      action: "ADMIN_USER_CREATED",
      targetType: "User",
      targetId: user._id,
      newValue: { role: normalizeRole(user.role), isActive: user.isActive, email: user.email, phone: user.phone },
    });
    return res.status(201).json({
      success: true,
      data: { id: user._id, fullName: user.fullName, email: user.email, phone: user.phone, role: normalizeRole(user.role), isActive: user.isActive },
    });
  },

  update: async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Validation failed", code: "VALIDATION_ERROR" });
    }
    const updates = {};
    if (parsed.data.fullName !== undefined) updates.fullName = parsed.data.fullName.trim();
    if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;
    if (parsed.data.role !== undefined) {
      const role = normalizeRole(parsed.data.role);
      if (!validAdminRole(role)) {
        return res.status(400).json({ success: false, message: "Invalid admin role", code: "INVALID_ROLE" });
      }
      updates.role = role;
    }
    const currentUserId = String(req.user?._id || "");
    const targetUser = await User.findById(req.params.id).select("role isActive");
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found", code: "NOT_FOUND" });
    }
    const targetId = String(targetUser._id);
    const oldRole = normalizeRole(targetUser.role);

    if (currentUserId && targetId === currentUserId) {
      if (updates.isActive === false) {
        return res.status(400).json({ success: false, message: "You cannot disable your own account", code: "SELF_DISABLE_BLOCKED" });
      }
      if (updates.role && normalizeRole(updates.role) !== oldRole) {
        return res.status(400).json({ success: false, message: "You cannot change your own role", code: "SELF_ROLE_CHANGE_BLOCKED" });
      }
    }

    if (oldRole === "SUPER_ADMIN" && (updates.isActive === false || (updates.role && normalizeRole(updates.role) !== "SUPER_ADMIN"))) {
      const activeSuperAdminCount = await User.countDocuments({
        role: { $in: ["SUPER_ADMIN", "admin"] },
        isActive: true,
      });
      if (activeSuperAdminCount <= 1) {
        return res.status(400).json({ success: false, message: "Cannot remove or disable the last SUPER_ADMIN", code: "LAST_SUPER_ADMIN_PROTECTED" });
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true })
      .select("fullName email phone role isActive createdAt updatedAt");

    await writeAdminAudit(req, {
      action: "ADMIN_USER_UPDATED",
      targetType: "User",
      targetId: user._id,
      oldValue: { role: oldRole, isActive: targetUser.isActive },
      newValue: { role: normalizeRole(user.role), isActive: user.isActive },
    });

    return res.json({ success: true, data: { ...user.toObject(), role: normalizeRole(user.role) } });
  },

  resetPassword: async (req, res) => {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Validation failed", code: "VALIDATION_ERROR" });
    }
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found", code: "NOT_FOUND" });
    }
    user.password = parsed.data.password;
    user.refreshTokenHash = null;
    await user.save();
    await writeAdminAudit(req, {
      action: "ADMIN_USER_PASSWORD_RESET",
      targetType: "User",
      targetId: user._id,
      newValue: { passwordReset: true },
    });
    return res.json({ success: true, data: { id: user._id } });
  },

  remove: async (req, res) => {
    const currentUserId = String(req.user?._id || "");
    const targetUser = await User.findById(req.params.id).select("role isActive");
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found", code: "NOT_FOUND" });
    }

    const targetId = String(targetUser._id);
    const targetRole = normalizeRole(targetUser.role);

    if (currentUserId && targetId === currentUserId) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account", code: "SELF_DELETE_BLOCKED" });
    }

    if (targetRole === "SUPER_ADMIN") {
      const activeSuperAdminCount = await User.countDocuments({
        role: { $in: ["SUPER_ADMIN", "admin"] },
        isActive: true,
      });
      if (activeSuperAdminCount <= 1) {
        return res.status(400).json({ success: false, message: "Cannot delete the last SUPER_ADMIN", code: "LAST_SUPER_ADMIN_PROTECTED" });
      }
    }

    await User.deleteOne({ _id: targetUser._id });
    await writeAdminAudit(req, {
      action: "ADMIN_USER_DELETED",
      targetType: "User",
      targetId: targetUser._id,
      oldValue: { role: targetRole, isActive: targetUser.isActive },
      newValue: { deleted: true },
    });

    return res.json({ success: true, data: { id: targetId } });
  },
};
