import { z } from "zod";
import User from "../models/User.js";
import {
  ADMIN_ROLES,
  ADMIN_DB_ROLE_VALUES,
  formatRole,
  formatRoles,
  getUserRoles,
  normalizeRoles,
  selectPrimaryRole,
  validateAdminRoleCombination,
} from "../utils/rbac.js";
import { normalizeEmail, normalizePhone } from "../utils/normalize.js";
import { writeAdminAudit } from "../utils/adminAudit.js";
import { getPasswordPolicyErrors } from "../utils/passwordPolicy.js";

const roleArraySchema = z.array(z.string().trim().min(2)).min(1).max(8);

const createSchema = z
  .object({
    fullName: z.string().trim().min(2),
    email: z.string().trim().email(),
    phone: z.string().trim().min(6),
    password: z.string().min(1),
    role: z.string().trim().min(2).optional(),
    roles: roleArraySchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((value) => Boolean(value.role || value.roles?.length), {
    message: "At least one role is required",
  });

const updateSchema = z.object({
  fullName: z.string().trim().min(2).optional(),
  role: z.string().trim().min(2).optional(),
  roles: roleArraySchema.optional(),
  isActive: z.boolean().optional(),
});

const resetPasswordSchema = z.object({
  password: z.string().min(1),
});

const normalizeAdminRoles = (payload = {}) => {
  const raw = Array.isArray(payload.roles) && payload.roles.length ? payload.roles : [payload.role];
  const roles = normalizeRoles(raw).filter((role) => role !== "user");
  if (!roles.length || roles.some((role) => !ADMIN_ROLES.includes(role))) {
    return { ok: false, roles, message: "Invalid admin role" };
  }
  const combination = validateAdminRoleCombination(roles);
  if (!combination.ok) return { ok: false, roles, message: combination.message, code: combination.code };
  return { ok: true, roles };
};

const publicAdminUser = (user) => {
  const source = typeof user?.toObject === "function" ? user.toObject() : user || {};
  const roles = getUserRoles(source).filter((role) => role !== "user");
  const role = selectPrimaryRole(roles);
  return {
    ...source,
    role,
    roles,
    roleLabel: formatRole(role),
    roleLabels: formatRoles(roles),
  };
};

const activeSuperAdminFilter = {
  isActive: true,
  $or: [
    { role: { $in: ["SUPER_ADMIN", "admin"] } },
    { roles: "SUPER_ADMIN" },
  ],
};

export const adminUserController = {
  list: async (req, res) => {
    const users = await User.find({
      $or: [
        { role: { $in: ADMIN_DB_ROLE_VALUES } },
        { roles: { $in: ADMIN_ROLES } },
      ],
    })
      .select("fullName email phone role roles isActive createdAt updatedAt")
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, data: users.map(publicAdminUser) });
  },

  create: async (req, res) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Validation failed", code: "VALIDATION_ERROR", details: parsed.error.issues });
    }
    const payload = parsed.data;
    const passwordErrors = getPasswordPolicyErrors(payload.password, {
      fullName: payload.fullName,
      email: payload.email,
    });
    if (passwordErrors.length) {
      return res.status(400).json({
        success: false,
        message: passwordErrors[0],
        code: "WEAK_PASSWORD",
        details: passwordErrors,
      });
    }

    const resolved = normalizeAdminRoles(payload);
    if (!resolved.ok) {
      return res.status(400).json({ success: false, message: resolved.message, code: resolved.code || "INVALID_ROLE" });
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
      role: selectPrimaryRole(resolved.roles),
      roles: resolved.roles,
      isActive: payload.isActive ?? true,
    });

    await writeAdminAudit(req, {
      action: "ADMIN_USER_CREATED",
      targetType: "User",
      targetId: user._id,
      newValue: { roles: resolved.roles, isActive: user.isActive, email: user.email, phone: user.phone },
    });

    return res.status(201).json({ success: true, data: publicAdminUser(user) });
  },

  update: async (req, res) => {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Validation failed", code: "VALIDATION_ERROR", details: parsed.error.issues });
    }

    const currentUserId = String(req.user?._id || "");
    const targetUser = await User.findById(req.params.id).select("role roles isActive refreshTokenHash");
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found", code: "NOT_FOUND" });
    }

    const targetId = String(targetUser._id);
    const oldRoles = getUserRoles(targetUser).filter((role) => role !== "user");
    const updates = {};

    if (parsed.data.fullName !== undefined) updates.fullName = parsed.data.fullName.trim();
    if (parsed.data.isActive !== undefined) updates.isActive = parsed.data.isActive;

    let nextRoles = oldRoles;
    if (parsed.data.roles !== undefined || parsed.data.role !== undefined) {
      const resolved = normalizeAdminRoles(parsed.data);
      if (!resolved.ok) {
        return res.status(400).json({ success: false, message: resolved.message, code: resolved.code || "INVALID_ROLE" });
      }
      nextRoles = resolved.roles;
      updates.roles = nextRoles;
      updates.role = selectPrimaryRole(nextRoles);
      updates.refreshTokenHash = null; // force a fresh login so new permissions take effect.
    }

    if (parsed.data.isActive === false) {
      updates.refreshTokenHash = null;
    }

    if (currentUserId && targetId === currentUserId) {
      if (updates.isActive === false) {
        return res.status(400).json({ success: false, message: "You cannot disable your own account", code: "SELF_DISABLE_BLOCKED" });
      }
      if (parsed.data.roles !== undefined || parsed.data.role !== undefined) {
        return res.status(400).json({ success: false, message: "You cannot change your own roles", code: "SELF_ROLE_CHANGE_BLOCKED" });
      }
    }

    const losesSuperAdmin = oldRoles.includes("SUPER_ADMIN") && !nextRoles.includes("SUPER_ADMIN");
    if (oldRoles.includes("SUPER_ADMIN") && (updates.isActive === false || losesSuperAdmin)) {
      const activeSuperAdminCount = await User.countDocuments(activeSuperAdminFilter);
      if (activeSuperAdminCount <= 1) {
        return res.status(400).json({ success: false, message: "Cannot remove or disable the last SUPER_ADMIN", code: "LAST_SUPER_ADMIN_PROTECTED" });
      }
    }

    const user = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true })
      .select("fullName email phone role roles isActive createdAt updatedAt");

    await writeAdminAudit(req, {
      action: "ADMIN_USER_UPDATED",
      targetType: "User",
      targetId: user._id,
      oldValue: { roles: oldRoles, isActive: targetUser.isActive },
      newValue: { roles: getUserRoles(user).filter((role) => role !== "user"), isActive: user.isActive },
    });

    return res.json({ success: true, data: publicAdminUser(user) });
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
    const passwordErrors = getPasswordPolicyErrors(parsed.data.password, {
      fullName: user.fullName,
      email: user.email,
    });
    if (passwordErrors.length) {
      return res.status(400).json({
        success: false,
        message: passwordErrors[0],
        code: "WEAK_PASSWORD",
        details: passwordErrors,
      });
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
    const targetUser = await User.findById(req.params.id).select("role roles isActive");
    if (!targetUser) {
      return res.status(404).json({ success: false, message: "User not found", code: "NOT_FOUND" });
    }

    const targetId = String(targetUser._id);
    const targetRoles = getUserRoles(targetUser).filter((role) => role !== "user");

    if (currentUserId && targetId === currentUserId) {
      return res.status(400).json({ success: false, message: "You cannot delete your own account", code: "SELF_DELETE_BLOCKED" });
    }

    if (targetRoles.includes("SUPER_ADMIN")) {
      const activeSuperAdminCount = await User.countDocuments(activeSuperAdminFilter);
      if (activeSuperAdminCount <= 1) {
        return res.status(400).json({ success: false, message: "Cannot delete the last SUPER_ADMIN", code: "LAST_SUPER_ADMIN_PROTECTED" });
      }
    }

    await User.deleteOne({ _id: targetUser._id });
    await writeAdminAudit(req, {
      action: "ADMIN_USER_DELETED",
      targetType: "User",
      targetId: targetUser._id,
      oldValue: { roles: targetRoles, isActive: targetUser.isActive },
      newValue: { deleted: true },
    });

    return res.json({ success: true, data: { id: targetId } });
  },
};
