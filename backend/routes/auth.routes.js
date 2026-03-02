import express from "express";
import {
  registerUser,
  loginUser,
  adminLoginUser,
  refreshAccessToken,
  logoutUser,
} from "../controllers/auth.controller.js";

const router = express.Router();

let rateLimitFactory;
try {
  const mod = await import("express-rate-limit");
  rateLimitFactory = mod.default || mod.rateLimit || mod;
} catch {
  // Fallback lightweight in-memory limiter if package is unavailable.
  rateLimitFactory = ({ windowMs, max, message }) => {
    const hits = new Map();
    return (req, res, next) => {
      const key = req.ip || req.socket?.remoteAddress || "unknown"; 
      const now = Date.now();
      const item = hits.get(key);

      if (!item || now > item.resetAt) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
        return next();
      }

      item.count += 1;
      if (item.count > max) {
        return res.status(429).json(message);
      }
      return next();
    };
  };
}

const registerLimiter = rateLimitFactory({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many registration attempts. Try again later.",
    code: "RATE_LIMITED",
  },
});

const loginLimiter = rateLimitFactory({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: "Too many login attempts. Try again after 15 minutes.",
    code: "RATE_LIMITED",
  },
});

router.post("/register", registerLimiter, registerUser);
router.post("/login", loginLimiter, loginUser);
router.post("/admin/login", loginLimiter, adminLoginUser);
router.post("/refresh", refreshAccessToken);
router.post("/logout", logoutUser);

export default router;
