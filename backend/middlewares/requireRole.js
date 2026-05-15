import { requireAdmin } from "./requireAdmin.js";
import { normalizeRole } from "../utils/rbac.js";

export const requireRole = (...roles) => {
  const allowed = new Set(roles.map((role) => normalizeRole(role)));
  return (req, res, next) => {
    requireAdmin(req, res, () => {
      const currentRole = normalizeRole(req.user?.role);
      if (!allowed.has(currentRole)) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: insufficient role",
          code: "ROLE_FORBIDDEN",
          details: {
            currentRole,
            allowedRoles: Array.from(allowed),
          },
        });
      }
      return next();
    });
  };
};
