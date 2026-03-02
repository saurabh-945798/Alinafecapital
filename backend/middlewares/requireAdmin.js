import { requireAuth } from "./requireAuth.js";

export const requireAdmin = (req, res, next) => {
  requireAuth(req, res, () => {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Forbidden: admin access required",
      });
    }
    return next();
  });
};

