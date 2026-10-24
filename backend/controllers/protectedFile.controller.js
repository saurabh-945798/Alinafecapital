import crypto from "crypto";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { LoanInquiry } from "../models/LoanInquiry.model.js";
import { BankPayment } from "../models/BankPayment.model.js";
import { UPLOAD_ROOT } from "../config/upload.js";
import { isAdminRole, normalizeRole } from "../utils/rbac.js";
import { normalizeEmail, normalizePhone } from "../utils/normalize.js";
import { writeAdminAudit } from "../utils/adminAudit.js";

const parseCookie = (cookieHeader = "", key) => {
  for (const part of String(cookieHeader || "").split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === key) return decodeURIComponent(value.join("="));
  }
  return "";
};

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const roleSet = (user) => {
  const source = [user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])];
  return new Set(source.map(normalizeRole).filter(Boolean));
};

const normalizeLoadedUser = (user) => {
  if (!user) return null;
  user.role = normalizeRole(user.role);
  if (Array.isArray(user.roles)) user.roles = [...roleSet(user)];
  return user;
};

const getSessionUser = async (req) => {
  // Preferred path for SPA/API calls: the current short-lived Bearer access token.
  const authHeader = String(req.headers.authorization || "");
  if (authHeader.startsWith("Bearer ")) {
    try {
      const accessToken = authHeader.slice(7).trim();
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("+refreshTokenHash -password");
      if (user?.isActive) return normalizeLoadedUser(user);
    } catch {
      // Fall through to the browser refresh-cookie path for legacy/direct file opens.
    }
  }

  const token = parseCookie(req.headers.cookie, "refreshToken");
  if (!token) return null;
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET);
  } catch {
    return null;
  }
  const user = await User.findById(decoded.id).select("+refreshTokenHash -password");
  if (!user?.isActive || !user.refreshTokenHash || hashToken(token) !== user.refreshTokenHash) return null;
  return normalizeLoadedUser(user);
};

const customerOwnsInquiryFolder = async (user, ownerId) => {
  if (!/^[a-fA-F0-9]{24}$/.test(ownerId)) return false;
  const inquiry = await LoanInquiry.findById(ownerId).select("email phone").lean();
  if (!inquiry) return false;
  const sameEmail = normalizeEmail(inquiry.email) && normalizeEmail(inquiry.email) === normalizeEmail(user.email);
  const samePhone = normalizePhone(inquiry.phone) && normalizePhone(inquiry.phone) === normalizePhone(user.phone);
  return Boolean(sameEmail || samePhone);
};

const hasAnyStaffRole = (user, allowedRoles) => {
  const roles = roleSet(user);
  return [...roles].some((role) => allowedRoles.has(role) && isAdminRole(role));
};

export const serveProtectedKycFile = async (req, res, next) => {
  try {
    const owner = String(req.params.owner || "").trim();
    const filename = String(req.params.filename || "").trim();
    if (!/^[a-zA-Z0-9_-]{1,80}$/.test(owner) || !/^[a-zA-Z0-9._-]{1,180}$/.test(filename)) {
      return res.status(400).json({ success: false, message: "Invalid file path", code: "INVALID_FILE_PATH" });
    }

    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ success: false, message: "Unauthorized", code: "UNAUTHORIZED" });
    req.user = user;

    const ownsFolder = String(user._id) === owner || (await customerOwnsInquiryFolder(user, owner));
    const staffKycRoles = new Set(["SUPER_ADMIN", "VERIFIER", "RISK_ANALYST", "APPROVAL", "AUTHORIZED", "AUDITOR"]);
    const staffAllowed = hasAnyStaffRole(user, staffKycRoles);
    if (!staffAllowed && !ownsFolder) {
      return res.status(403).json({ success: false, message: "Forbidden", code: "FORBIDDEN" });
    }

    const root = path.resolve(UPLOAD_ROOT, "kyc");
    const absolute = path.resolve(root, owner, filename);
    if (!absolute.startsWith(`${root}${path.sep}`) || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      return res.status(404).json({ success: false, message: "File not found", code: "NOT_FOUND" });
    }

    if (staffAllowed) {
      await writeAdminAudit(req, {
        action: "KYC_DOCUMENT_VIEWED",
        targetType: "KycDocument",
        targetId: owner,
        newValue: { filename },
      });
    }

    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    return res.sendFile(absolute, { dotfiles: "deny" });
  } catch (error) {
    return next(error);
  }
};

export const serveProtectedPaymentPop = async (req, res, next) => {
  try {
    const paymentId = String(req.params.paymentId || "").trim();
    if (!/^[a-fA-F0-9]{24}$/.test(paymentId)) {
      return res.status(400).json({ success: false, message: "Invalid payment id", code: "INVALID_PAYMENT_ID" });
    }

    const user = await getSessionUser(req);
    if (!user) return res.status(401).json({ success: false, message: "Unauthorized", code: "UNAUTHORIZED" });
    req.user = user;

    const payment = await BankPayment.findById(paymentId).select("userId pop").lean();
    if (!payment?.pop?.filePath) {
      return res.status(404).json({ success: false, message: "Proof of Payment not found", code: "NOT_FOUND" });
    }

    const staffPaymentRoles = new Set(["SUPER_ADMIN", "PAYMENT_VERIFIER", "AUDITOR"]);
    const staffAllowed = hasAnyStaffRole(user, staffPaymentRoles);
    const customerAllowed = String(payment.userId || "") === String(user._id || "");
    if (!staffAllowed && !customerAllowed) {
      return res.status(403).json({ success: false, message: "Forbidden", code: "FORBIDDEN" });
    }

    const root = path.resolve(UPLOAD_ROOT, "payments");
    const absolute = path.resolve(String(payment.pop.filePath || ""));
    if (!absolute.startsWith(`${root}${path.sep}`) || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      return res.status(404).json({ success: false, message: "Proof of Payment file not found", code: "NOT_FOUND" });
    }

    if (staffAllowed) {
      await writeAdminAudit(req, {
        action: "PAYMENT_POP_VIEWED",
        targetType: "BankPayment",
        targetId: paymentId,
        newValue: { viewed: true },
      });
    }

    res.setHeader("Cache-Control", "private, no-store");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Cross-Origin-Resource-Policy", "same-site");
    const safeName = String(payment.pop.originalName || "proof-of-payment")
      .replace(/[\r\n"]/g, "_")
      .slice(0, 120);
    res.setHeader("Content-Disposition", `inline; filename="${safeName}"`);
    return res.sendFile(absolute, { dotfiles: "deny" });
  } catch (error) {
    return next(error);
  }
};
