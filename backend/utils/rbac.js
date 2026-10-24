export const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "VERIFIER",
  "RISK_ANALYST",
  "APPROVAL",
  "AUTHORIZED",
  "DISBURSED",
  "PAYMENT_VERIFIER",
  "AUDITOR",
];

export const ADMIN_ROLE_LABELS = {
  SUPER_ADMIN: "SUPER ADMIN",
  VERIFIER: "KYC VERIFIER",
  RISK_ANALYST: "RISK ANALYST",
  APPROVAL: "APPROVER",
  APPROVER: "APPROVER",
  AUTHORIZED: "AUTHORIZER",
  AUTHORIZER: "AUTHORIZER",
  DISBURSED: "DISBURSER",
  DISBURSER: "DISBURSER",
  PAYMENT_VERIFIER: "PAYMENT VERIFIER",
  AUDITOR: "AUDITOR",
};

export const ADMIN_ROLE_ALIASES = {
  ADMIN: String(process.env.LEGACY_ADMIN_FALLBACK_ROLE || "APPROVAL").trim().toUpperCase(),
  APPROVER: "APPROVAL",
  AUTHORIZER: "AUTHORIZED",
  DISBURSER: "DISBURSED",
  RISK: "RISK_ANALYST",
  FINANCE: "PAYMENT_VERIFIER",
};

export const ADMIN_DB_ROLE_VALUES = Array.from(
  new Set(["admin", ...ADMIN_ROLES, "APPROVER", "AUTHORIZER", "DISBURSER"])
);

export const normalizeRole = (role = "") => {
  const value = String(role || "").trim();
  if (!value) return "";
  if (value.toLowerCase() === "user") return "user";
  const upper = value.toUpperCase();
  return ADMIN_ROLE_ALIASES[upper] || upper;
};

export const formatRole = (role = "") => {
  const normalized = normalizeRole(role);
  return ADMIN_ROLE_LABELS[normalized] || normalized || "-";
};

export const isAdminRole = (role = "") => ADMIN_ROLES.includes(normalizeRole(role));

export const canManageAdminUsers = (role = "") => normalizeRole(role) === "SUPER_ADMIN";

export const roleAllowedActions = {
  SUPER_ADMIN: ["VERIFIED", "APPROVED", "AUTHORIZED", "DISBURSED", "CLOSED", "KYC_REJECTED"],
  VERIFIER: ["VERIFIED", "KYC_REJECTED", "CLOSED"],
  RISK_ANALYST: [],
  APPROVAL: ["APPROVED", "KYC_REJECTED", "CLOSED"],
  AUTHORIZED: ["AUTHORIZED", "CLOSED"],
  DISBURSED: ["DISBURSED", "CLOSED"],
  PAYMENT_VERIFIER: [],
  AUDITOR: [],
};

export const canPerformAction = (role = "", action = "") => {
  const normalizedRole = normalizeRole(role);
  const normalizedAction = String(action || "").toUpperCase();
  if (normalizedRole === "SUPER_ADMIN") return true;
  return (roleAllowedActions[normalizedRole] || []).includes(normalizedAction);
};
