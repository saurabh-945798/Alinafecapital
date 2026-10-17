import dotenv from "dotenv";
import mongoose from "mongoose";
import User from "../models/User.js";
import { connectDB } from "../config/config.js";
import { normalizeEmail } from "../utils/normalize.js";
import { selectPrimaryRole, validateAdminRoleCombination } from "../utils/rbac.js";

dotenv.config();

const APPLY = process.argv.includes("--apply");

// Approved allocation derived from the Alinafe Capital staff-role workbook.
// Auditor is intentionally not combined with Credit Approver for Akuzike because
// the audit function must remain independent and read-only.
const STAFF_MATRIX = [
  { name: "Moses Chirambo", email: "moizmsanda@gmail.com", roles: ["SUPER_ADMIN", "AUTHORIZED"] },
  { name: "Billiat Chikalusa", email: "billiatchikalusa@gmail.com", roles: ["VERIFIER", "CUSTOMER_SERVICE", "REPORTING_MIS"] },
  { name: "Kondwani Kadzakumanja", email: "kondwanikadzakumanja2@gmail.com", roles: ["VERIFIER", "CUSTOMER_SERVICE"] },
  { name: "Emily Sikelo", email: "emilysikelo@gmail.com", roles: ["LOAN_OPERATIONS", "DISBURSED", "PAYMENT_VERIFIER", "REPORTING_MIS"] },
  { name: "John Kango", email: "kangojohn2020@gmail.com", roles: ["RISK_ANALYST", "COLLECTIONS"] },
  { name: "Precious Mkandawire", email: "preciousmkandawire@gmail.com", roles: ["RISK_ANALYST", "FINANCE_RECON"] },
  { name: "Akuzike Chidula", email: "akuzikemalawi@gmail.com", roles: ["APPROVAL"] },
  { name: "Roselyn Milanzi", email: "roselyncmchirambo@gmail.com", roles: ["DISBURSED", "PAYMENT_VERIFIER"] },
];

const technicalSupportEmail = normalizeEmail(process.env.RESTOCK_TECH_SUPPORT_EMAIL || "");
if (technicalSupportEmail) {
  STAFF_MATRIX.push({ name: "Restock Tech", email: technicalSupportEmail, roles: ["TECH_SUPPORT"] });
}

const run = async () => {
  await connectDB();
  const results = [];

  for (const entry of STAFF_MATRIX) {
    const email = normalizeEmail(entry.email);
    const combination = validateAdminRoleCombination(entry.roles);
    if (!combination.ok) {
      throw new Error(`${entry.name}: ${combination.message}`);
    }

    const user = await User.findOne({ email });
    if (!user) {
      results.push({ name: entry.name, email, status: "MISSING_ACCOUNT", roles: entry.roles });
      continue;
    }

    const update = {
      roles: entry.roles,
      role: selectPrimaryRole(entry.roles),
      refreshTokenHash: null,
    };

    if (APPLY) {
      user.roles = update.roles;
      user.role = update.role;
      user.refreshTokenHash = null;
      await user.save({ validateBeforeSave: true });
    }

    results.push({
      name: entry.name,
      email,
      status: APPLY ? "UPDATED" : "WOULD_UPDATE",
      primaryRole: update.role,
      roles: update.roles,
    });
  }

  if (!technicalSupportEmail) {
    results.push({
      name: "Restock Tech",
      email: "",
      status: "SKIPPED_NO_EMAIL",
      roles: ["TECH_SUPPORT"],
      note: "Set RESTOCK_TECH_SUPPORT_EMAIL before running with --apply if a technical-support account is required.",
    });
  }

  console.table(results.map((item) => ({
    name: item.name,
    email: item.email,
    status: item.status,
    primaryRole: item.primaryRole || "",
    roles: (item.roles || []).join(" | "),
  })));

  if (!APPLY) {
    console.log("Dry run only. Re-run with --apply to update matching staff accounts.");
  }
  console.log("Note: Akuzike Chidula is assigned Credit Approver only. Auditor access must be allocated to a separate independent account.");

  await mongoose.connection.close();
};

run().catch(async (error) => {
  console.error("Staff role assignment failed:", error);
  await mongoose.connection.close().catch(() => {});
  process.exit(1);
});
