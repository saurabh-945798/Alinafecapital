import crypto from "crypto";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { registerSchema, loginSchema } from "../utils/validators/auth.validators.js";
import { isValidE164Phone, normalizeEmail, normalizePhone } from "../utils/normalize.js";

const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MINUTES = 30;

const issueAccessToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "15m" });

const issueRefreshToken = (userId) =>
  jwt.sign({ id: userId }, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  });

const hashRefreshToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: "/api/v1/auth",
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
    const parsed = registerSchema.safeParse(req.body);
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

    const accessToken = issueAccessToken(user._id);
    const refreshToken = issueRefreshToken(user._id);
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
          role: user.role,
        },
      },
      201
    );
  } catch (error) {
    return next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) throw parsed.error;

    const phone = normalizePhone(parsed.data.phone);
    const password = parsed.data.password;

    if (!isValidE164Phone(phone)) {
      return authError(res, "Invalid phone format", "VALIDATION_ERROR", 400);
    }

    const user = await User.findOne({ phone });

    if (!user) {
      return authError(res, "Invalid credentials", "INVALID_CREDENTIALS", 401);
    }

    if (user.lockUntil && user.lockUntil <= new Date()) {
      user.loginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }

    if (user.lockUntil && user.lockUntil > new Date()) {
      return authError(
        res,
        "Account temporarily locked due to multiple failed attempts. Try again later.",
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
      await user.save();
      return authError(res, "Invalid credentials", "INVALID_CREDENTIALS", 401);
    }

    if (!user.isActive) {
      return authError(res, "Account disabled", "ACCOUNT_DISABLED", 403);
    }

    user.loginAttempts = 0;
    user.lockUntil = null;

    const accessToken = issueAccessToken(user._id);
    const refreshToken = issueRefreshToken(user._id);
    user.refreshTokenHash = hashRefreshToken(refreshToken);
    await user.save();

    res.cookie("refreshToken", refreshToken, getCookieOptions());

    return sendAuthSuccess(res, {
      message: "Login successful",
      accessToken,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
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

    const incomingHash = hashRefreshToken(refreshToken);
    if (incomingHash !== user.refreshTokenHash) {
      return authError(res, "Invalid refresh token", "INVALID_REFRESH_TOKEN", 401);
    }

    const newAccessToken = issueAccessToken(user._id);
    const newRefreshToken = issueRefreshToken(user._id);
    user.refreshTokenHash = hashRefreshToken(newRefreshToken);
    await user.save();

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
