import { requireAuth } from "./requireAuth.js";
import { isAdminRole } from "../utils/rbac.js";

export const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    const role = String(req.user?.role || "");
    if (!req.user || !isAdminRole(role)) {
      return res.status(403).json({
        success: false,
        message: "Forbidden: admin access required",
        code: "ADMIN_ACCESS_REQUIRED",
      });
    }
    return next();
  });
};
