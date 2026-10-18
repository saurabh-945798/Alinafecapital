export const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "VERIFIER",
  "LOAN_OPERATIONS",
  "RISK_ANALYST",
  "APPROVAL",
  "AUTHORIZED",
  "DISBURSED",
  "PAYMENT_VERIFIER",
  "FINANCE_RECON",
  "COLLECTIONS",
  "CUSTOMER_SERVICE",
  "REPORTING_MIS",
  "AUDITOR",
  "TECH_SUPPORT",
];

export const ADMIN_ROLE_LABELS = {
  SUPER_ADMIN: "SUPER ADMIN",
  VERIFIER: "KYC VERIFIER",
  LOAN_OPERATIONS: "LOAN OPERATIONS",
  RISK_ANALYST: "RISK ANALYST",
  APPROVAL: "CREDIT APPROVER",
  APPROVER: "CREDIT APPROVER",
  AUTHORIZED: "CREDIT AUTHORIZER",
  AUTHORIZER: "CREDIT AUTHORIZER",
  DISBURSED: "DISBURSEMENT OFFICER",
  DISBURSER: "DISBURSEMENT OFFICER",
  PAYMENT_VERIFIER: "PAYMENT VERIFICATION",
  FINANCE_RECON: "FINANCE & RECONCILIATION",
  COLLECTIONS: "COLLECTIONS & RECOVERIES",
  CUSTOMER_SERVICE: "CUSTOMER SERVICE",
  REPORTING_MIS: "REPORTING & MIS",
  AUDITOR: "AUDITOR / COMPLIANCE",
  TECH_SUPPORT: "TECHNICAL SUPPORT",
};

const ROLE_ALIASES = {
  ADMIN: "APPROVAL",
  APPROVER: "APPROVAL",
  AUTHORIZER: "AUTHORIZED",
  DISBURSER: "DISBURSED",
  RISK: "RISK_ANALYST",
  FINANCE: "FINANCE_RECON",
  RECONCILIATION: "FINANCE_RECON",
  COLLECTION: "COLLECTIONS",
  SUPPORT: "CUSTOMER_SERVICE",
  MIS: "REPORTING_MIS",
  TECHNICAL_SUPPORT: "TECH_SUPPORT",
};

const PRIMARY_ROLE_PRIORITY = [
  "SUPER_ADMIN",
  "APPROVAL",
  "AUTHORIZED",
  "DISBURSED",
  "VERIFIER",
  "RISK_ANALYST",
  "PAYMENT_VERIFIER",
  "FINANCE_RECON",
  "LOAN_OPERATIONS",
  "COLLECTIONS",
  "CUSTOMER_SERVICE",
  "REPORTING_MIS",
  "AUDITOR",
  "TECH_SUPPORT",
];

const normalizeSingle = (role = "") => {
  const value = String(role || "").trim().toUpperCase();
  if (!value) return "";
  return ROLE_ALIASES[value] || value;
};

export const normalizeAdminRoles = (input = []) => {
  let values = [];
  if (Array.isArray(input)) values = input;
  else if (input && typeof input === "object") values = [...(Array.isArray(input.roles) ? input.roles : []), input.role];
  else values = [input];
  return Array.from(new Set(values.map(normalizeSingle).filter((role) => ADMIN_ROLES.includes(role))));
};

export const normalizeAdminRole = (input = "") => {
  const roles = normalizeAdminRoles(input);
  return PRIMARY_ROLE_PRIORITY.find((role) => roles.includes(role)) || roles[0] || "";
};

export const formatAdminRole = (role = "") => {
  const normalized = normalizeSingle(role);
  return ADMIN_ROLE_LABELS[normalized] || normalized || "-";
};

export const formatAdminRoles = (input = []) =>
  normalizeAdminRoles(input).map((role) => formatAdminRole(role));

export const hasAnyRole = (input, allowedRoles = []) => {
  const current = new Set(normalizeAdminRoles(input));
  return allowedRoles.map(normalizeSingle).some((role) => current.has(role));
};

export const roleAllowedActions = {
  SUPER_ADMIN: ["VERIFIED", "APPROVED", "AUTHORIZED", "DISBURSED", "CLOSED", "KYC_REJECTED"],
  VERIFIER: ["VERIFIED", "KYC_REJECTED"],
  LOAN_OPERATIONS: ["CLOSED"],
  RISK_ANALYST: [],
  APPROVAL: ["APPROVED", "KYC_REJECTED", "CLOSED"],
  AUTHORIZED: ["AUTHORIZED", "CLOSED"],
  DISBURSED: ["DISBURSED", "CLOSED"],
  PAYMENT_VERIFIER: [],
  FINANCE_RECON: [],
  COLLECTIONS: [],
  CUSTOMER_SERVICE: [],
  REPORTING_MIS: [],
  AUDITOR: [],
  TECH_SUPPORT: [],
};

export const canTakeStatusAction = (input, status) => {
  const currentRoles = normalizeAdminRoles(input);
  if (currentRoles.includes("SUPER_ADMIN")) return true;
  const action = String(status || "").toUpperCase();
  return currentRoles.some((role) => (roleAllowedActions[role] || []).includes(action));
};
