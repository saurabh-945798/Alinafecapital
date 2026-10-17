import "dotenv/config";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import mongoose from "mongoose";
import { connectDB } from "../config/config.js";
import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";
import { LoanInquiry } from "../models/LoanInquiry.model.js";
import { LoanAccount } from "../models/LoanAccount.model.js";

const args = new Set(process.argv.slice(2));
const APPLY = args.has("--apply");
const REPORT_DIR = path.resolve(process.cwd(), "reports");
const INVITE_FILE = path.join(REPORT_DIR, "legacy-customer-login-invites.csv");

const normalizeEmail = (value = "") => String(value || "").trim().toLowerCase();
const normalizePhone = (value = "") => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("265") && digits.length === 12) return `0${digits.slice(3)}`;
  if (digits.length === 9) return `0${digits}`;
  return digits;
};

const safeCsv = (value = "") => `"${String(value ?? "").replace(/"/g, '""')}"`;
const randomPassword = () => `Alinafe-${crypto.randomBytes(4).toString("hex")}-2026`;

const buildLookup = ({ email, phone }) => {
  const or = [];
  if (email) or.push({ email });
  if (phone) or.push({ phone });
  return or.length ? { $or: or } : null;
};

const pickIdentity = (account, inquiry) => {
  const email = normalizeEmail(account.email || inquiry?.email || "");
  const phone = normalizePhone(account.phone || inquiry?.phone || "");
  const fullName = String(account.customerName || inquiry?.fullName || "").trim() || "Legacy Customer";
  const addressLine1 = String(inquiry?.addressLine1 || inquiry?.address || "").trim();
  return { email, phone, fullName, addressLine1 };
};

const toProfilePatch = (identity, inquiry) => ({
  fullName: identity.fullName,
  email: identity.email,
  phone: identity.phone,
  addressLine1: identity.addressLine1,
  city: inquiry?.city || inquiry?.district || "",
  district: inquiry?.district || "",
  country: inquiry?.country || "Malawi",
  employmentType: inquiry?.employmentType || inquiry?.employmentStatus || "",
  businessName: inquiry?.businessName || "",
  employerNameOrBusinessAddress: inquiry?.employerNameOrBusinessAddress || "",
  businessActivityNature: inquiry?.businessActivityNature || "",
  jobTitle: inquiry?.jobTitle || "",
  employmentNumber: inquiry?.employmentNumber || "",
  employmentStatus: inquiry?.employmentStatus || "",
  hrContactPhone: inquiry?.hrContactPhone || "",
  governmentId: inquiry?.governmentId || inquiry?.applicantNationalIdNumber || "",
  monthlyIncome: inquiry?.monthlyIncome || undefined,
  bankName: inquiry?.bankName || "",
  accountNumber: inquiry?.accountNumber || "",
  branchCode: inquiry?.branchCode || "",
  reference1Name: inquiry?.reference1Name || "",
  reference1Phone: inquiry?.reference1Phone || "",
  reference2Name: inquiry?.reference2Name || "",
  reference2Phone: inquiry?.reference2Phone || "",
  guarantorRelationship: inquiry?.guarantorRelationship || "",
  guarantorNationalId: inquiry?.guarantorNationalId || "",
  avatarUrl: inquiry?.avatarUrl || "",
  avatarPath: inquiry?.avatarPath || "",
  profileCompletion: 100,
  kycStatus: "verified",
  kycRemarks: "Migrated from existing manual/admin records.",
  verifiedAt: inquiry?.verifiedAt || inquiry?.approvedAt || inquiry?.disbursedAt || new Date(),
  submittedAt: inquiry?.submittedAt || inquiry?.createdAt || new Date(),
});

const main = async () => {
  await connectDB();
  const accounts = await LoanAccount.find({}).sort({ createdAt: 1 });
  const inviteRows = [["fullName", "email", "phone", "accountNumber", "applicationCode", "temporaryPassword", "action"]];

  const summary = {
    scanned: 0,
    skippedMissingIdentity: 0,
    usersCreated: 0,
    usersLinked: 0,
    profilesUpserted: 0,
    accountsLinked: 0,
    dryRun: !APPLY,
  };

  for (const account of accounts) {
    summary.scanned += 1;
    const inquiry = account.inquiryId ? await LoanInquiry.findById(account.inquiryId) : null;
    const identity = pickIdentity(account, inquiry);

    if (!identity.email && !identity.phone) {
      summary.skippedMissingIdentity += 1;
      console.warn(`[skip] ${account.accountNumber}: no email or phone available.`);
      continue;
    }

    const lookup = buildLookup(identity);
    let user = lookup ? await User.findOne(lookup) : null;
    let tempPassword = "";
    let action = "linked_existing_user";

    if (!user) {
      tempPassword = randomPassword();
      action = "created_user";
      const email = identity.email || `legacy.${identity.phone.replace(/\D/g, "")}@alinafecapital.local`;
      const phone = identity.phone || `099${crypto.randomInt(1000000, 9999999)}`;
      user = new User({ fullName: identity.fullName, email, phone, password: tempPassword, role: "user", isActive: true });
      if (APPLY) await user.save();
      summary.usersCreated += 1;
    } else {
      summary.usersLinked += 1;
    }

    const profilePatch = toProfilePatch(identity, inquiry);
    if (APPLY) {
      await UserProfile.findOneAndUpdate(
        { userId: user._id },
        { $set: { ...profilePatch, userId: user._id } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      account.userId = user._id;
      account.email = identity.email || account.email;
      account.phone = identity.phone || account.phone;
      account.customerName = identity.fullName || account.customerName;
      account.legacyCustomerReference = account.legacyCustomerReference || account.applicationCode || account.accountNumber;
      account.migrationSource = account.migrationSource || "legacy_admin_records";
      account.migratedAt = new Date();
      await account.save();
    }

    summary.profilesUpserted += 1;
    summary.accountsLinked += 1;
    inviteRows.push([
      identity.fullName,
      user.email || identity.email,
      user.phone || identity.phone,
      account.accountNumber,
      account.applicationCode,
      tempPassword,
      action,
    ]);
  }

  if (APPLY) {
    fs.mkdirSync(REPORT_DIR, { recursive: true });
    fs.writeFileSync(INVITE_FILE, inviteRows.map((row) => row.map(safeCsv).join(",")).join("\n"));
    console.log(`Invite file written to ${INVITE_FILE}`);
  }

  console.table(summary);
  if (!APPLY) console.log("Dry run only. Re-run with --apply after reviewing the summary.");

  await mongoose.disconnect();
};

main().catch(async (error) => {
  console.error("Legacy customer linking failed:");
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});
