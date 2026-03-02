import { requireAuth } from "./requireAuth.js";

export const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    const role = String(req.user?.role || "").toLowerCase();
    if (!req.user || role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: admin access required",
        code: "ADMIN_ACCESS_REQUIRED",
      });
    }
    return next();
  });
};
