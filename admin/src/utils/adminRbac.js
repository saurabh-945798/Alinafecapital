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

const ROLE_ALIASES = {
  ADMIN: "APPROVAL",
  APPROVER: "APPROVAL",
  AUTHORIZER: "AUTHORIZED",
  DISBURSER: "DISBURSED",
  RISK: "RISK_ANALYST",
  FINANCE: "PAYMENT_VERIFIER",
};

export const normalizeAdminRole = (role = "") => {
  const value = String(role || "").trim().toUpperCase();
  if (!value) return "";
  return ROLE_ALIASES[value] || value;
};

export const formatAdminRole = (role = "") => {
  const normalized = normalizeAdminRole(role);
  return ADMIN_ROLE_LABELS[normalized] || normalized || "-";
};

export const hasAnyRole = (role, allowedRoles = []) => {
  const current = normalizeAdminRole(role);
  if (!current) return false;
  return allowedRoles.map((item) => normalizeAdminRole(item)).includes(current);
};

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

export const canTakeStatusAction = (role, status) => {
  const normalizedRole = normalizeAdminRole(role);
  if (normalizedRole === "SUPER_ADMIN") return true;
  return (roleAllowedActions[normalizedRole] || []).includes(String(status || "").toUpperCase());
};
