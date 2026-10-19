import { requireAdmin } from "./requireAdmin.js";
import { getUserRoles, normalizeRole } from "../utils/rbac.js";

export const requireRole = (...roles) => {
  const allowed = new Set(roles.map((role) => normalizeRole(role)).filter(Boolean));
  return (req, res, next) => {
    requireAdmin(req, res, () => {
      const currentRoles = getUserRoles(req.user).filter((role) => role !== "user");
      const permitted = currentRoles.some((role) => allowed.has(role));
      if (!permitted) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: insufficient role",
          code: "ROLE_FORBIDDEN",
          details: {
            currentRoles,
            allowedRoles: Array.from(allowed),
          },
        });
      }
      return next();
    });
  };
};
