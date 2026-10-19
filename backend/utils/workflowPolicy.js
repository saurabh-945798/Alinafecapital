import { getUserRoles, normalizeRole } from "./rbac.js";

export const WORKFLOW_STAGES = [
  "NEW",
  "CONTACTED",
  "KYC_SENT",
  "VERIFIED",
  "KYC_REJECTED",
  "APPROVED",
  "AUTHORIZED",
  "DISBURSED",
  "CLOSED",
];

export const STATUS_TRANSITIONS = {
  NEW: ["VERIFIED", "KYC_REJECTED", "CLOSED"],
  CONTACTED: ["VERIFIED", "KYC_REJECTED", "CLOSED"],
  KYC_SENT: ["VERIFIED", "KYC_REJECTED", "CLOSED"],
  VERIFIED: ["APPROVED", "CLOSED"],
  KYC_REJECTED: ["VERIFIED", "CLOSED"],
  APPROVED: ["AUTHORIZED", "CLOSED"],
  AUTHORIZED: ["DISBURSED", "CLOSED"],
  DISBURSED: ["CLOSED"],
  CLOSED: [],
};

export const ROLE_ALLOWED_ACTIONS = {
  SUPER_ADMIN: ["VERIFIED", "KYC_REJECTED", "APPROVED", "AUTHORIZED", "DISBURSED", "CLOSED"],
  VERIFIER: ["VERIFIED", "KYC_REJECTED"],
  LOAN_OPERATIONS: ["CLOSED"],
  APPROVAL: ["APPROVED", "CLOSED"],
  AUTHORIZED: ["AUTHORIZED", "CLOSED"],
  DISBURSED: ["DISBURSED", "CLOSED"],
};

export const getInquiryStage = (doc = {}) => {
  const status = String(doc?.status || "").toUpperCase();
  if (status === "DISBURSED") return "DISBURSED";
  if (status === "AUTHORIZED") return "AUTHORIZED";
  if (status === "APPROVED") return "APPROVED";
  if (status === "CLOSED") return "CLOSED";
  if (doc?.kycStatus === "verified") return "VERIFIED";
  if (doc?.kycStatus === "rejected" || status === "KYC_REJECTED") return "KYC_REJECTED";
  if (status === "KYC_SENT") return "KYC_SENT";
  if (status === "CONTACTED") return "CONTACTED";
  return "NEW";
};

export const canRolePerformAction = (userOrRoles = "", action = "") => {
  const roles = getUserRoles(userOrRoles);
  const normalizedAction = String(action || "").toUpperCase();
  if (roles.includes("SUPER_ADMIN")) return true;
  return roles.some((role) => (ROLE_ALLOWED_ACTIONS[normalizeRole(role)] || []).includes(normalizedAction));
};

export const canTransitionInquiry = ({ fromStage = "", toStage = "", role = "", roles = [] }) => {
  const from = String(fromStage || "").toUpperCase();
  const to = String(toStage || "").toUpperCase();
  if (!WORKFLOW_STAGES.includes(from) || !WORKFLOW_STAGES.includes(to)) {
    return { ok: false, code: "INVALID_STAGE", message: "Invalid workflow stage." };
  }
  if (from === to) {
    return { ok: false, code: "NO_STATUS_CHANGE", message: "Status is already set." };
  }
  const allowedTo = STATUS_TRANSITIONS[from] || [];
  if (!allowedTo.includes(to)) {
    return { ok: false, code: "INVALID_STATUS_TRANSITION", message: `Invalid status transition: ${from} -> ${to}` };
  }
  if (!canRolePerformAction(roles.length ? roles : role, to)) {
    return { ok: false, code: "ROLE_ACTION_FORBIDDEN", message: "Forbidden: this role cannot perform this action" };
  }
  return { ok: true };
};

const APPLICATION_TRANSITIONS = {
  PRE_APPLICATION: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["UNDER_REVIEW", "REJECTED", "CANCELLED"],
  PENDING: ["UNDER_REVIEW", "REJECTED", "CANCELLED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["DISBURSED", "CANCELLED"],
  REJECTED: [],
  DISBURSED: [],
  CANCELLED: [],
};

const APPLICATION_ROLE_ACTIONS = {
  SUPER_ADMIN: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "DISBURSED", "REJECTED", "CANCELLED"],
  LOAN_OPERATIONS: ["SUBMITTED", "UNDER_REVIEW", "CANCELLED"],
  VERIFIER: ["UNDER_REVIEW"],
  APPROVAL: ["APPROVED", "REJECTED", "CANCELLED"],
  AUTHORIZED: ["CANCELLED"],
  DISBURSED: ["DISBURSED", "CANCELLED"],
};

export const canTransitionLoanApplication = ({ fromStage = "", toStage = "", role = "", roles = [] }) => {
  const from = String(fromStage || "").toUpperCase();
  const to = String(toStage || "").toUpperCase();
  const allowedTo = APPLICATION_TRANSITIONS[from] || [];
  if (!allowedTo.includes(to)) {
    return { ok: false, code: "INVALID_STATUS_TRANSITION", message: `Invalid status transition: ${from} -> ${to}` };
  }
  const currentRoles = getUserRoles(roles.length ? roles : role);
  const allowed = currentRoles.some((currentRole) =>
    (APPLICATION_ROLE_ACTIONS[normalizeRole(currentRole)] || []).includes(to)
  );
  if (!allowed) {
    return { ok: false, code: "ROLE_ACTION_FORBIDDEN", message: "Forbidden: this role cannot perform this action" };
  }
  return { ok: true };
};
