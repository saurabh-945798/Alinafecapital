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

export const ADMIN_ROLE_ALIASES = {
  ADMIN: String(process.env.LEGACY_ADMIN_FALLBACK_ROLE || "APPROVAL").trim().toUpperCase(),
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

export const normalizeRoles = (input = []) => {
  let values = [];
  if (Array.isArray(input)) {
    values = input;
  } else if (input && typeof input === "object") {
    values = [
      ...(Array.isArray(input.roles) ? input.roles : []),
      input.role,
    ];
  } else {
    values = [input];
  }

  const normalized = values
    .map((item) => normalizeRole(item))
    .filter(Boolean);

  const unique = Array.from(new Set(normalized));
  if (unique.includes("user")) {
    return unique.length === 1 ? ["user"] : unique.filter((role) => role !== "user");
  }
  return unique;
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

export const selectPrimaryRole = (input = []) => {
  const roles = normalizeRoles(input).filter((role) => role !== "user");
  if (!roles.length) return "user";
  return PRIMARY_ROLE_PRIORITY.find((role) => roles.includes(role)) || roles[0];
};

export const getUserRoles = (userOrRoles = []) => normalizeRoles(userOrRoles);

export const formatRole = (role = "") => {
  const normalized = normalizeRole(role);
  return ADMIN_ROLE_LABELS[normalized] || normalized || "-";
};

export const formatRoles = (input = []) =>
  getUserRoles(input)
    .filter((role) => role !== "user")
    .map((role) => formatRole(role));

export const hasAnyRole = (userOrRoles = [], allowedRoles = []) => {
  const current = new Set(getUserRoles(userOrRoles));
  const allowed = allowedRoles.map((role) => normalizeRole(role)).filter(Boolean);
  return allowed.some((role) => current.has(role));
};

export const isAdminRole = (input = "") =>
  getUserRoles(input).some((role) => ADMIN_ROLES.includes(role));

export const canManageAdminUsers = (input = "") => hasAnyRole(input, ["SUPER_ADMIN"]);

// Auditor access must remain independent from operational decision-making.
// Reporting/MIS is read-only and may be combined with Auditor if management explicitly chooses.
export const validateAdminRoleCombination = (input = []) => {
  const roles = getUserRoles(input).filter((role) => role !== "user");
  const invalid = roles.filter((role) => !ADMIN_ROLES.includes(role));
  if (invalid.length) {
    return { ok: false, code: "INVALID_ROLE", message: `Invalid role(s): ${invalid.join(", ")}` };
  }

  if (roles.includes("AUDITOR")) {
    const operational = roles.filter((role) => !["AUDITOR", "REPORTING_MIS"].includes(role));
    if (operational.length) {
      return {
        ok: false,
        code: "AUDITOR_ROLE_CONFLICT",
        message: "Auditor access must remain read-only and cannot be combined with operational approval, payment, risk, KYC, disbursement or administration roles.",
      };
    }
  }

  return { ok: true };
};

export const ROLE_GROUPS = {
  APPLICATION_READ: [
    "SUPER_ADMIN",
    "LOAN_OPERATIONS",
    "VERIFIER",
    "RISK_ANALYST",
    "APPROVAL",
    "AUTHORIZED",
    "DISBURSED",
    "CUSTOMER_SERVICE",
    "AUDITOR",
  ],
  INQUIRY_READ: [
    "SUPER_ADMIN",
    "LOAN_OPERATIONS",
    "VERIFIER",
    "RISK_ANALYST",
    "APPROVAL",
    "AUTHORIZED",
    "DISBURSED",
    "CUSTOMER_SERVICE",
    "AUDITOR",
  ],
  CUSTOMER_READ: [
    "SUPER_ADMIN",
    "LOAN_OPERATIONS",
    "VERIFIER",
    "RISK_ANALYST",
    "APPROVAL",
    "AUTHORIZED",
    "DISBURSED",
    "COLLECTIONS",
    "CUSTOMER_SERVICE",
    "AUDITOR",
  ],
  ACCOUNT_READ: [
    "SUPER_ADMIN",
    "DISBURSED",
    "PAYMENT_VERIFIER",
    "FINANCE_RECON",
    "COLLECTIONS",
    "REPORTING_MIS",
    "AUDITOR",
  ],
  REPORT_READ: ["SUPER_ADMIN", "REPORTING_MIS", "AUDITOR"],
  FINANCE_READ: ["SUPER_ADMIN", "FINANCE_RECON", "AUDITOR"],
  PAYMENT_READ: ["SUPER_ADMIN", "PAYMENT_VERIFIER", "FINANCE_RECON", "AUDITOR"],
  COMPLAINT_READ: ["SUPER_ADMIN", "CUSTOMER_SERVICE", "AUDITOR"],
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

export const canPerformAction = (userOrRoles = "", action = "") => {
  const normalizedAction = String(action || "").toUpperCase();
  const roles = getUserRoles(userOrRoles);
  if (roles.includes("SUPER_ADMIN")) return true;
  return roles.some((role) => (roleAllowedActions[role] || []).includes(normalizedAction));
};
