import { AdminAuditLog } from "../models/AdminAuditLog.js";
import { normalizeRole } from "./rbac.js";

export const writeAdminAudit = async (req, payload = {}) => {
  try {
    await AdminAuditLog.create({
      actorUserId: req?.user?._id || null,
      actorEmail: req?.user?.email || "",
      actorRole: normalizeRole(req?.user?.role || ""),
      action: payload.action || "unknown_action",
      targetType: payload.targetType || "unknown_target",
      targetId: String(payload.targetId || ""),
      oldValue: payload.oldValue ?? null,
      newValue: payload.newValue ?? null,
      ipAddress: String(req?.ip || req?.headers?.["x-forwarded-for"] || "").trim(),
    });
  } catch {
    // never break business flow for audit write failure
  }
};
