import express from "express";
import {
  registerUser,
  loginUser,
  adminLoginUser,
  refreshAccessToken,
  logoutUser,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";

const router = express.Router();

const intEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : fallback;
};

const normalizeLoginIdentity = (req) => {
  const raw = String(
    req.body?.loginId || req.body?.email || req.body?.phone || "missing"
  )
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
  return raw.slice(0, 180) || "missing";
};

let rateLimitFactory;
try {
  const mod = await import("express-rate-limit");
  rateLimitFactory = mod.default || mod.rateLimit || mod;
} catch {
  // Lightweight development fallback. Production should install express-rate-limit.
  rateLimitFactory = ({ windowMs, max, message, keyGenerator, skipSuccessfulRequests = false }) => {
    const hits = new Map();
    return (req, res, next) => {
      const key = keyGenerator
        ? String(keyGenerator(req, res) || "unknown")
        : String(req.ip || req.socket?.remoteAddress || "unknown");
      const now = Date.now();
      const item = hits.get(key);
      if (!item || now > item.resetAt) {
        hits.set(key, { count: 1, resetAt: now + windowMs });
      } else {
        item.count += 1;
        if (item.count > max) return res.status(429).json(message);
      }
      if (skipSuccessfulRequests) {
        res.on("finish", () => {
          if (res.statusCode < 400) {
            const current = hits.get(key);
            if (current) current.count = Math.max(0, current.count - 1);
          }
        });
      }
      return next();
    };
  };
}

const registerLimiter = rateLimitFactory({
  windowMs: 60 * 60 * 1000,
  max: intEnv("REGISTER_MAX_ATTEMPTS_PER_HOUR", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many registration attempts. Try again later.",
    code: "RATE_LIMITED",
  },
});

// Important production behavior: login throttling is keyed to the login identity,
// not only to a shared public/NAT IP. One user's mistakes therefore cannot impose
// a 15-minute wait on unrelated customers or staff.
const loginWindowMs = intEnv("LOGIN_ID_WINDOW_MINUTES", 15) * 60 * 1000;
const loginIdentityLimiter = rateLimitFactory({
  windowMs: loginWindowMs,
  max: intEnv("LOGIN_ID_MAX_ATTEMPTS", 10),
  keyGenerator: (req) => `${req.path.startsWith("/admin") ? "admin" : "customer"}:${normalizeLoginIdentity(req)}`,
  skipSuccessfulRequests: true,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many failed login attempts for these credentials. Please try again later.",
    code: "LOGIN_ID_RATE_LIMITED",
  },
});

// Separate high-ceiling service-abuse guard. This is intentionally much higher
// than the per-identity threshold so normal users behind the same public IP are
// not locked out by someone else's failed password attempts.
const loginIpBurstLimiter = rateLimitFactory({
  windowMs: loginWindowMs,
  max: intEnv("LOGIN_IP_MAX_ATTEMPTS", 100),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many login requests from this network. Please try again shortly.",
    code: "LOGIN_NETWORK_RATE_LIMITED",
  },
});

const forgotPasswordLimiter = rateLimitFactory({
  windowMs: intEnv("PASSWORD_RESET_REQUEST_WINDOW_MINUTES", 15) * 60 * 1000,
  max: intEnv("PASSWORD_RESET_REQUEST_MAX", 5),
  keyGenerator: (req) => `forgot:${String(req.body?.email || "missing").trim().toLowerCase().slice(0, 180)}`,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password reset requests. Please try again later.",
    code: "PASSWORD_RESET_RATE_LIMITED",
  },
});

const resetPasswordLimiter = rateLimitFactory({
  windowMs: 15 * 60 * 1000,
  max: intEnv("PASSWORD_RESET_SUBMIT_MAX", 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many password reset attempts. Please request a new reset link.",
    code: "PASSWORD_RESET_RATE_LIMITED",
  },
});

const refreshLimiter = rateLimitFactory({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many token refresh attempts. Try again later.",
    code: "RATE_LIMITED",
  },
});

router.post("/register", registerLimiter, registerUser);
router.post("/login", loginIpBurstLimiter, loginIdentityLimiter, loginUser);
router.post("/admin/login", loginIpBurstLimiter, loginIdentityLimiter, adminLoginUser);
router.post("/forgot-password", forgotPasswordLimiter, forgotPassword);
router.post("/reset-password", resetPasswordLimiter, resetPassword);
router.post("/refresh", refreshLimiter, refreshAccessToken);
router.post("/logout", logoutUser);

export default router;
