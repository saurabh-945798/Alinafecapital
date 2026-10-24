import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../utils/validators/auth.validators.js";
import { isValidE164Phone, normalizeEmail, normalizePhone } from "../utils/normalize.js";
import { isAdminRole, normalizeRole } from "../utils/rbac.js";
import { syncLatestInquiryToCustomerProfile } from "../services/customerAccountLink.service.js";
import { getPasswordPolicyErrors } from "../utils/passwordPolicy.js";
import {
  assertPasswordResetEmailReady,
  sendPasswordResetEmail,
} from "../services/email.service.js";

const MAX_LOGIN_ATTEMPTS = Number(process.env.MAX_LOGIN_ATTEMPTS || 5);
const LOCK_MINUTES = Number(process.env.LOCK_MINUTES || 15);
const PASSWORD_RESET_MINUTES = Number(process.env.PASSWORD_RESET_MINUTES || 15);
const RESET_RESPONSE = "If the email is registered, reset instructions have been sent.";

const issueAccessToken = (user) =>
  jwt.sign(
    {
      id: user._id,
      role: normalizeRole(user.role),
      isActive: Boolean(user.isActive),
    },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

const issueRefreshToken = (user) =>
  jwt.sign({ id: user._id, role: normalizeRole(user.role) }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });

const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const hashResetToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/v1",
});

const parseCookie = (cookieHeader = "", key) => {
  const pairs = cookieHeader.split(";").map((v) => v.trim());
  for (const pair of pairs) {
    const [k, ...rest] = pair.split("=");
    if (k === key) return decodeURIComponent(rest.join("="));
  }
  return null;
};

const authError = (res, message, code = "AUTH_ERROR", status = 401) =>
  res.status(status).json({ success: false, message, code });

const sendAuthSuccess = (res, data, status = 200) => res.status(status).json({ success: true, data });

export const registerUser = async (req, res, next) => {
  try {
    const parsed = registerSchema.safeParse({
      ...req.body,
      phone: normalizePhone(req.body?.phone),
    });
    if (!parsed.success) throw parsed.error;

    const fullName = parsed.data.fullName.trim();
    const email = normalizeEmail(parsed.data.email);
    const phone = normalizePhone(parsed.data.phone);
    const password = parsed.data.password;

    if (!isValidE164Phone(phone)) {
      return authError(res, "Invalid phone format", "VALIDATION_ERROR", 400);
    }

    const existingUser = await User.findOne({ $or: [{ phone }, { email }] }).lean();
    if (existingUser) {
      const samePhone = existingUser.phone === phone;
      const sameEmail = existingUser.email === email;

      if (samePhone && sameEmail) {
        return authError(
          res,
          "Phone and email are already registered.",
          "DUPLICATE_USER",
          409
        );
      }
      if (samePhone) {
        return authError(res, "Phone already exists.", "DUPLICATE_USER", 409);
      }
      if (sameEmail) {
        return authError(res, "Email already exists.", "DUPLICATE_USER", 409);
      }
      return authError(res, "User already exists.", "DUPLICATE_USER", 409);
    }

    const user = await User.create({ fullName, email, phone, password });

    // If this borrower already submitted a public loan inquiry, copy that KYC/profile
    // information into the login account so the customer dashboard and admin customer
    // records show the same KYC state.
    await syncLatestInquiryToCustomerProfile(user);

    const accessToken = issueAccessToken(user);
    const refreshToken = issueRefreshToken(user);
    const refreshTokenHash = hashRefreshToken(refreshToken);

    user.refreshTokenHash = refreshTokenHash;
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    res.cookie("refreshToken", refreshToken, getCookieOptions());

    return sendAuthSuccess(
      res,
      {
        message: "Account created successfully",
        accessToken,
        user: {
          id: user._id,
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: normalizeRole(user.role),
        },
      },
      201
    );
  } catch (error) {
    return next(error);
  }
};

const loginCore = async (req, res, next, { adminOnly = false } = {}) => {
  try {
    const parsed = loginSchema.safeParse(req.body || {});
    if (!parsed.success) throw parsed.error;

    const rawLoginId = String(
      parsed.data.loginId || parsed.data.phone || parsed.data.email || ""
    ).trim();
    const password = parsed.data.password;
    const isEmailLogin = rawLoginId.includes("@");

    let user = null;
    if (isEmailLogin) {
      const email = normalizeEmail(rawLoginId);
      user = await User.findOne({ email });
    } else {
      const phone = normalizePhone(rawLoginId);
      if (!isValidE164Phone(phone)) {
        return authError(
          res,
          "Enter a valid email or Malawi phone number",
          "VALIDATION_ERROR",
          400
        );
      }
      user = await User.findOne({ phone });
    }

    if (!user) {
      return authError(res, "Invalid credentials", "INVALID_CREDENTIALS", 401);
    }

    if (user.lockUntil && user.lockUntil <= new Date()) {
      user.loginAttempts = 0;
      user.lockUntil = null;
      await user.save({ validateBeforeSave: false });
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      const remainingMs = user.lockUntil.getTime() - Date.now();
      const retryAfterMinutes = Math.max(1, Math.ceil(remainingMs / 60000));
      return authError(
        res,
        `Account temporarily locked. Try again in ${retryAfterMinutes} minute(s).`,
        "ACCOUNT_LOCKED",
        423
      );
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      user.loginAttempts = (user.loginAttempts || 0) + 1;
      if (user.loginAttempts >= MAX_LOGIN_ATTEMPTS) {
        user.lockUntil = new Date(Date.now() + LOCK_MINUTES * 60 * 1000);
      }
      await user.save({ validateBeforeSave: false });
      return authError(res, "Invalid credentials", "INVALID_CREDENTIALS", 401);
    }

    if (!user.isActive) {
      return authError(res, "Account disabled", "ACCOUNT_DISABLED", 403);
    }

    if (adminOnly && !isAdminRole(user.role)) {
      return authError(
        res,
        "Forbidden: admin access required",
        "ADMIN_ACCESS_REQUIRED",
        403
      );
    }

    user.loginAttempts = 0;
    user.lockUntil = null;

    const accessToken = issueAccessToken(user);
    const refreshToken = issueRefreshToken(user);
    user.refreshTokenHash = hashRefreshToken(refreshToken);
    await user.save({ validateBeforeSave: false });

    if (!adminOnly) {
      await syncLatestInquiryToCustomerProfile(user);
    }

    res.cookie("refreshToken", refreshToken, getCookieOptions());

    return sendAuthSuccess(res, {
      message: "Login successful",
      accessToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: normalizeRole(user.role),
      },
    });
  } catch (error) {
    return next(error);
  }
};

export const loginUser = async (req, res, next) => loginCore(req, res, next, { adminOnly: false });

export const adminLoginUser = async (req, res, next) =>
  loginCore(req, res, next, { adminOnly: true });

export const forgotPassword = async (req, res, next) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body || {});
    if (!parsed.success) throw parsed.error;

    // Check infrastructure before account lookup so service availability never leaks
    // whether a supplied email exists in the database.
    try {
      assertPasswordResetEmailReady();
    } catch (error) {
      console.error(`[password-reset] Email service unavailable: ${error.code || error.message}`);
      return authError(
        res,
        "Password reset service is temporarily unavailable. Please try again later.",
        "PASSWORD_RESET_UNAVAILABLE",
        503
      );
    }

    const email = normalizeEmail(parsed.data.email);
    const user = await User.findOne({ email }).select(
      "+passwordResetTokenHash +passwordResetExpiresAt +passwordResetRequestedAt"
    );

    // Customer-only flow. Admin accounts deliberately receive the same neutral response.
    if (!user || normalizeRole(user.role) !== "user" || !user.isActive) {
      return sendAuthSuccess(res, { message: RESET_RESPONSE });
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    user.passwordResetTokenHash = hashResetToken(rawToken);
    user.passwordResetExpiresAt = new Date(Date.now() + PASSWORD_RESET_MINUTES * 60 * 1000);
    user.passwordResetRequestedAt = new Date();
    await user.save({ validateBeforeSave: false });

    const base = String(process.env.PASSWORD_RESET_BASE_URL || "").trim();
    if (!base) {
      user.passwordResetTokenHash = null;
      user.passwordResetExpiresAt = null;
      await user.save({ validateBeforeSave: false });
      console.error("[password-reset] PASSWORD_RESET_BASE_URL is not configured");
      return authError(
        res,
        "Password reset service is temporarily unavailable. Please try again later.",
        "PASSWORD_RESET_UNAVAILABLE",
        503
      );
    }

    const separator = base.includes("?") ? "&" : "?";
    const resetUrl = `${base}${separator}token=${encodeURIComponent(rawToken)}`;
    try {
      await sendPasswordResetEmail({
        to: user.email,
        fullName: user.fullName,
        resetUrl,
        expiresMinutes: PASSWORD_RESET_MINUTES,
      });
    } catch (error) {
      user.passwordResetTokenHash = null;
      user.passwordResetExpiresAt = null;
      await user.save({ validateBeforeSave: false });
      console.error(`[password-reset] Email delivery failed: ${error.code || error.message}`);
      return authError(
        res,
        "Password reset service is temporarily unavailable. Please try again later.",
        "PASSWORD_RESET_UNAVAILABLE",
        503
      );
    }

    return sendAuthSuccess(res, { message: RESET_RESPONSE });
  } catch (error) {
    return next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body || {});
    if (!parsed.success) throw parsed.error;

    const tokenHash = hashResetToken(parsed.data.token);
    const user = await User.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpiresAt: { $gt: new Date() },
    }).select(
      "+passwordResetTokenHash +passwordResetExpiresAt +passwordResetRequestedAt +refreshTokenHash"
    );

    if (!user || normalizeRole(user.role) !== "user" || !user.isActive) {
      return authError(res, "This reset link is invalid or has expired.", "RESET_TOKEN_INVALID", 400);
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
    user.passwordResetTokenHash = null;
    user.passwordResetExpiresAt = null;
    user.passwordResetRequestedAt = null;
    user.refreshTokenHash = null;
    user.loginAttempts = 0;
    user.lockUntil = null;
    await user.save();

    res.clearCookie("refreshToken", { ...getCookieOptions(), maxAge: undefined });
    return sendAuthSuccess(res, {
      message: "Password reset successfully. You can now sign in with your new password.",
    });
  } catch (error) {
    return next(error);
  }
};

export const refreshAccessToken = async (req, res, next) => {
  try {
    const cookieHeader = req.headers.cookie || "";
    const refreshToken = parseCookie(cookieHeader, "refreshToken");

    if (!refreshToken) {
      return authError(res, "Refresh token missing", "REFRESH_TOKEN_MISSING", 401);
    }

    let decoded;
    try {
      decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
      );
    } catch {
      return authError(res, "Invalid refresh token", "INVALID_REFRESH_TOKEN", 401);
    }

    const user = await User.findById(decoded.id).select("+refreshTokenHash");
    if (!user || !user.refreshTokenHash) {
      return authError(res, "Unauthorized", "AUTH_ERROR", 401);
    }
    if (!user.isActive) {
      return authError(res, "Account disabled", "ACCOUNT_DISABLED", 403);
    }
    // Any role recognized by the central RBAC registry is a valid admin role.
    // Do not maintain a second, stale whitelist here: it previously blocked
    // Risk, Payment Verification and Auditor sessions during token refresh.
    const refreshedRole = normalizeRole(user.role);
    if (refreshedRole !== "user" && !isAdminRole(refreshedRole)) {
      return authError(res, "Unauthorized role", "ROLE_INVALID", 403);
    }

    const incomingHash = hashRefreshToken(refreshToken);
    if (incomingHash !== user.refreshTokenHash) {
      return authError(res, "Invalid refresh token", "INVALID_REFRESH_TOKEN", 401);
    }

    const newAccessToken = issueAccessToken(user);
    const newRefreshToken = issueRefreshToken(user);
    user.refreshTokenHash = hashRefreshToken(newRefreshToken);
    await user.save({ validateBeforeSave: false });

    res.cookie("refreshToken", newRefreshToken, getCookieOptions());

    return sendAuthSuccess(res, {
      message: "Token refreshed",
      accessToken: newAccessToken,
    });
  } catch (error) {
    return next(error);
  }
};

export const logoutUser = async (req, res, next) => {
  try {
    const cookieHeader = req.headers.cookie || "";
    const refreshToken = parseCookie(cookieHeader, "refreshToken");
    if (refreshToken) {
      const decoded = jwt.decode(refreshToken);
      const userId = decoded?.id;
      if (userId) {
        await User.findByIdAndUpdate(userId, { $set: { refreshTokenHash: null } });
      }
    }

    res.clearCookie("refreshToken", { ...getCookieOptions(), maxAge: undefined });
    return sendAuthSuccess(res, { message: "Logged out" });
  } catch (error) {
    return next(error);
  }
};
