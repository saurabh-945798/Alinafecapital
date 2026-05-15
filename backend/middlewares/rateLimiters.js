import rateLimit from "express-rate-limit";

export const strictAdminWriteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many admin write requests. Try again later.",
    code: "RATE_LIMITED",
  },
});
