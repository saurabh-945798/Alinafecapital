import dotenv from "dotenv";
import path from "path";
import mongoose from "mongoose";
import { connectDB } from "../config/config.js";
import { LoanInquiry } from "../models/LoanInquiry.model.js";
import UserProfile from "../models/UserProfile.js";
import { UPLOAD_ROOT } from "../config/upload.js";

dotenv.config();

const toAbsoluteFromFileUrl = (fileUrl = "") => {
  const normalized = String(fileUrl || "").trim();
  if (!normalized.startsWith("/uploads/")) return "";
  const relative = normalized.replace(/^\/uploads\/+/, "");
  return path.resolve(UPLOAD_ROOT, relative).replace(/\\/g, "/");
};

const isWindowsPath = (value = "") => /^[a-zA-Z]:[\\/]/.test(String(value || "").trim());

const repairLoanInquiry = async (doc) => {
  let changed = false;

  if (String(doc.avatarUrl || "").trim()) {
    const nextAvatarPath = toAbsoluteFromFileUrl(doc.avatarUrl);
    if (nextAvatarPath && String(doc.avatarPath || "").replace(/\\/g, "/") !== nextAvatarPath) {
      doc.avatarPath = nextAvatarPath;
      changed = true;
    }
  }

  if (Array.isArray(doc.documents)) {
    const nextDocs = doc.documents.map((entry) => {
      const nextFilePath = toAbsoluteFromFileUrl(entry?.fileUrl || "");
      if (!nextFilePath) return entry;
      const current = String(entry?.filePath || "").replace(/\\/g, "/");
      if (current !== nextFilePath || isWindowsPath(current)) {
        changed = true;
        return { ...entry.toObject?.() || entry, filePath: nextFilePath };
      }
      return entry;
    });
    if (changed) doc.documents = nextDocs;
  }

  if (changed) await doc.save();
  return changed;
};

const repairUserProfile = async (doc) => {
  let changed = false;

  if (String(doc.avatarUrl || "").trim()) {
    const nextAvatarPath = toAbsoluteFromFileUrl(doc.avatarUrl);
    if (nextAvatarPath && String(doc.avatarPath || "").replace(/\\/g, "/") !== nextAvatarPath) {
      doc.avatarPath = nextAvatarPath;
      changed = true;
    }
  }

  if (Array.isArray(doc.documents)) {
    const nextDocs = doc.documents.map((entry) => {
      const nextFilePath = toAbsoluteFromFileUrl(entry?.fileUrl || "");
      if (!nextFilePath) return entry;
      const current = String(entry?.filePath || "").replace(/\\/g, "/");
      if (current !== nextFilePath || isWindowsPath(current)) {
        changed = true;
        return { ...entry.toObject?.() || entry, filePath: nextFilePath };
      }
      return entry;
    });
    if (changed) doc.documents = nextDocs;
  }

  if (changed) await doc.save();
  return changed;
};

const run = async () => {
  await connectDB();
  let loanInquiryFixed = 0;
  let profileFixed = 0;

  const inquiries = await LoanInquiry.find({});
  for (const doc of inquiries) {
    // eslint-disable-next-line no-await-in-loop
    if (await repairLoanInquiry(doc)) loanInquiryFixed += 1;
  }

  const profiles = await UserProfile.find({});
  for (const doc of profiles) {
    // eslint-disable-next-line no-await-in-loop
    if (await repairUserProfile(doc)) profileFixed += 1;
  }

  // eslint-disable-next-line no-console
  console.info(`[repair-upload-paths] uploadRoot=${UPLOAD_ROOT} fixedLoanInquiries=${loanInquiryFixed} fixedProfiles=${profileFixed}`);
  await mongoose.connection.close();
};

run().catch(async (error) => {
  // eslint-disable-next-line no-console
  console.error("[repair-upload-paths] failed", error);
  await mongoose.connection.close();
  process.exit(1);
});

