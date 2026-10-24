import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ADMIN_ROLES, normalizeRole } from "../utils/rbac.js";
import { canTransitionInquiry } from "../utils/workflowPolicy.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(here, "..");
const projectRoot = path.resolve(backendRoot, "..");
const read = (relative) => fs.readFileSync(path.resolve(projectRoot, relative), "utf8");

test("all production admin roles are recognized by the central RBAC registry", () => {
  for (const role of ["SUPER_ADMIN", "VERIFIER", "RISK_ANALYST", "APPROVAL", "AUTHORIZED", "DISBURSED", "PAYMENT_VERIFIER", "AUDITOR"]) {
    assert.ok(ADMIN_ROLES.includes(role), `${role} missing from ADMIN_ROLES`);
  }
  assert.equal(normalizeRole("DISBURSER"), "DISBURSED");
});

test("only the disbursement role or super admin can take AUTHORIZED to DISBURSED", () => {
  assert.equal(canTransitionInquiry({ fromStage: "AUTHORIZED", toStage: "DISBURSED", role: "DISBURSED" }).ok, true);
  assert.equal(canTransitionInquiry({ fromStage: "AUTHORIZED", toStage: "DISBURSED", role: "SUPER_ADMIN" }).ok, true);
  for (const role of ["VERIFIER", "RISK_ANALYST", "APPROVAL", "AUTHORIZED", "PAYMENT_VERIFIER", "AUDITOR"]) {
    assert.equal(canTransitionInquiry({ fromStage: "AUTHORIZED", toStage: "DISBURSED", role }).ok, false, role);
  }
});

test("login throttling is identity-aware and password-reset routes are installed", () => {
  const source = read("backend/routes/auth.routes.js");
  assert.match(source, /loginIdentityLimiter/);
  assert.match(source, /normalizeLoginIdentity/);
  assert.match(source, /LOGIN_IP_MAX_ATTEMPTS/);
  assert.match(source, /router\.post\("\/forgot-password"/);
  assert.match(source, /router\.post\("\/reset-password"/);
});

test("token refresh no longer carries a stale role whitelist", () => {
  const source = read("backend/controllers/auth.controller.js");
  assert.doesNotMatch(source, /\["SUPER_ADMIN", "VERIFIER", "APPROVAL", "AUTHORIZED", "DISBURSED"\]\.includes\(normalizeRole\(user\.role\)\)/);
  assert.match(source, /!isAdminRole\(refreshedRole\)/);
});

test("KYC and POP document views use protected authenticated file APIs", () => {
  const protectedController = read("backend/controllers/protectedFile.controller.js");
  const application = read("admin/src/components/LoanApplication/LoanApplicationDetail.jsx");
  const compliance = read("admin/src/components/Compliance/Compliance.jsx");
  const payments = read("admin/src/components/PaymentVerification/PaymentVerification.jsx");
  assert.match(protectedController, /KYC_DOCUMENT_VIEWED/);
  assert.match(protectedController, /PAYMENT_POP_VIEWED/);
  assert.match(application, /protectedFilesApi\.open\(doc\.fileUrl\)/);
  assert.match(compliance, /protectedFilesApi\.open\(doc\.fileUrl\)/);
  assert.match(payments, /protectedFilesApi\.open\(popUrl\)/);
  assert.doesNotMatch(application, /href=\{resolveAssetUrl\(doc\.fileUrl\)\}/);
});

test("KYC verifier UI includes the expanded production document set", () => {
  const compliance = read("admin/src/components/Compliance/Compliance.jsx");
  for (const key of ["national_id", "bank_statement_3_months", "security_offer", "guarantor_national_id", "payslip_or_business_proof", "address_proof"]) {
    assert.match(compliance, new RegExp(key));
  }
});

test("both customer and admin portals default to a 10 minute idle timeout", () => {
  assert.match(read("frontend/src/context/AuthContext.jsx"), /VITE_SESSION_IDLE_MINUTES \|\| 10/);
  assert.match(read("admin/src/layout/AdminLayout.jsx"), /VITE_SESSION_IDLE_MINUTES \|\| 10/);
});

test("staff password reset uses an explicit show-hide password field instead of browser prompt", () => {
  const source = read("admin/src/components/UserAccess/UserAccess.jsx");
  assert.doesNotMatch(source, /window\.prompt\(`Enter a new strong password/);
  assert.match(source, /showResetPassword/);
  assert.match(source, /Reset staff password/);
});

test("risk report and Super Admin payment edit/delete controls are present", () => {
  assert.match(read("admin/src/components/RiskAssessment/RiskAssessment.jsx"), /View Risk Report/);
  assert.match(read("admin/src/components/RiskAssessment/RiskAssessment.jsx"), /Print \/ Save as PDF/);
  const routes = read("backend/routes/admin.account.routes.js");
  assert.match(routes, /router\.patch\([\s\S]*requireRole\("SUPER_ADMIN"\)/);
  assert.match(routes, /router\.delete\([\s\S]*requireRole\("SUPER_ADMIN"\)/);
});
