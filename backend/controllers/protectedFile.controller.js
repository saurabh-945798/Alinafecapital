import crypto from "crypto";
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { LoanInquiry } from "../models/LoanInquiry.model.js";
import { BankPayment } from "../models/BankPayment.model.js";
import UserProfile from "../models/UserProfile.js";
import { UPLOAD_ROOT } from "../config/upload.js";
import { getUserRoles, hasAnyRole, isAdminRole, selectPrimaryRole } from "../utils/rbac.js";
import { normalizeEmail, normalizePhone } from "../utils/normalize.js";

const parseCookie = (cookieHeader = "", key) => {
  for (const part of String(cookieHeader || "").split(";")) {
    const [name, ...value] = part.trim().split("=");
    if (name === key) return decodeURIComponent(value.join("="));
  }
  return "";
};

const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const getSessionUser = async (req) => {
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
  user.roles = getUserRoles(user).filter((role) => role !== "user");
  user.role = selectPrimaryRole(user.roles);
  return user;
};

const customerOwnsInquiryFolder = async (user, ownerId) => {
  if (!/^[a-fA-F0-9]{24}$/.test(ownerId)) return false;
  const inquiry = await LoanInquiry.findById(ownerId).select("email phone").lean();
  if (!inquiry) return false;
  const sameEmail = normalizeEmail(inquiry.email) && normalizeEmail(inquiry.email) === normalizeEmail(user.email);
  const samePhone = normalizePhone(inquiry.phone) && normalizePhone(inquiry.phone) === normalizePhone(user.phone);
  return Boolean(sameEmail || samePhone);
};


const fileNameFromStoredPath = (value = "") => {
  const normalized = String(value || "").replace(/\\/g, "/");
  return normalized.split("/").filter(Boolean).pop() || "";
};

const getKycDocumentType = async (ownerId, filename) => {
  if (!/^[a-fA-F0-9]{24}$/.test(ownerId)) return "";

  const inquiry = await LoanInquiry.findById(ownerId).select("documents").lean();
  const inquiryDoc = (inquiry?.documents || []).find((doc) =>
    [doc?.filePath, doc?.fileUrl].some((value) => fileNameFromStoredPath(value) === filename)
  );
  if (inquiryDoc?.type) return String(inquiryDoc.type);

  const profile = await UserProfile.findOne({ userId: ownerId }).select("documents").lean();
  const profileDoc = (profile?.documents || []).find((doc) =>
    [doc?.filePath, doc?.fileUrl].some((value) => fileNameFromStoredPath(value) === filename)
  );
  return String(profileDoc?.type || "");
};

const canStaffReadKycDocument = async (user, ownerId, filename) => {
  if (!isAdminRole(user)) return false;
  if (hasAnyRole(user, ["SUPER_ADMIN", "APPROVAL", "AUTHORIZED", "AUDITOR"])) return true;

  const documentType = await getKycDocumentType(ownerId, filename);
  if (!documentType) return false;
  if (hasAnyRole(user, ["VERIFIER"]) && documentType === "national_id") return true;
  if (
    hasAnyRole(user, ["RISK_ANALYST"]) &&
    ["bank_statement_3_months", "security_offer", "guarantor_national_id", "payslip_or_business_proof"].includes(documentType)
  ) {
    return true;
  }
  return false;
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

    const ownsFolder = String(user._id) === owner || (await customerOwnsInquiryFolder(user, owner));
    const staffAllowed = await canStaffReadKycDocument(user, owner, filename);
    if (!staffAllowed && !ownsFolder) {
      return res.status(403).json({ success: false, message: "Forbidden", code: "FORBIDDEN" });
    }

    const root = path.resolve(UPLOAD_ROOT, "kyc");
    const absolute = path.resolve(root, owner, filename);
    if (!absolute.startsWith(`${root}${path.sep}`) || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      return res.status(404).json({ success: false, message: "File not found", code: "NOT_FOUND" });
    }

    res.setHeader("Cache-Control", "private, no-store");
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

    const payment = await BankPayment.findById(paymentId).select("userId pop").lean();
    if (!payment?.pop?.filePath) {
      return res.status(404).json({ success: false, message: "Proof of Payment not found", code: "NOT_FOUND" });
    }

    const staffAllowed = hasAnyRole(user, ["SUPER_ADMIN", "PAYMENT_VERIFIER", "FINANCE_RECON", "AUDITOR"]);
    const customerAllowed = String(payment.userId || "") === String(user._id || "");
    if (!staffAllowed && !customerAllowed) {
      return res.status(403).json({ success: false, message: "Forbidden", code: "FORBIDDEN" });
    }

    const root = path.resolve(UPLOAD_ROOT, "payments");
    const absolute = path.resolve(String(payment.pop.filePath || ""));
    if (!absolute.startsWith(`${root}${path.sep}`) || !fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
      return res.status(404).json({ success: false, message: "Proof of Payment file not found", code: "NOT_FOUND" });
    }

    res.setHeader("Cache-Control", "private, no-store");
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
