export const ADMIN_ROLES = [
  "SUPER_ADMIN",
  "VERIFIER",
  "APPROVAL",
  "AUTHORIZED",
  "DISBURSED",
];

export const normalizeRole = (role = "") => {
  const value = String(role || "").trim();
  if (!value) return "";
  if (value.toLowerCase() === "admin") {
    return String(process.env.LEGACY_ADMIN_FALLBACK_ROLE || "APPROVAL").trim().toUpperCase();
  }
  if (value.toLowerCase() === "user") return "user";
  return value.toUpperCase();
};

export const isAdminRole = (role = "") => ADMIN_ROLES.includes(normalizeRole(role));

export const canManageAdminUsers = (role = "") => normalizeRole(role) === "SUPER_ADMIN";

export const roleAllowedActions = {
  SUPER_ADMIN: ["VERIFIED", "APPROVED", "AUTHORIZED", "DISBURSED", "CLOSED", "KYC_REJECTED"],
  VERIFIER: ["VERIFIED", "KYC_REJECTED", "CLOSED"],
  APPROVAL: ["APPROVED", "KYC_REJECTED", "CLOSED"],
  AUTHORIZED: ["AUTHORIZED", "CLOSED"],
  DISBURSED: ["DISBURSED", "CLOSED"],
};

export const canPerformAction = (role = "", action = "") => {
  const normalizedRole = normalizeRole(role);
  const normalizedAction = String(action || "").toUpperCase();
  if (normalizedRole === "SUPER_ADMIN") return true;
  return (roleAllowedActions[normalizedRole] || []).includes(normalizedAction);
};
