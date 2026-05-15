import { normalizeRole } from "./rbac.js";

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
  VERIFIER: ["VERIFIED", "KYC_REJECTED", "CLOSED"],
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

export const canRolePerformAction = (role = "", action = "") => {
  const normalizedRole = normalizeRole(role);
  const normalizedAction = String(action || "").toUpperCase();
  return (ROLE_ALLOWED_ACTIONS[normalizedRole] || []).includes(normalizedAction);
};

export const canTransitionInquiry = ({ fromStage = "", toStage = "", role = "" }) => {
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
  if (!canRolePerformAction(role, to)) {
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
  VERIFIER: ["UNDER_REVIEW", "REJECTED", "CANCELLED"],
  APPROVAL: ["APPROVED", "REJECTED", "CANCELLED"],
  AUTHORIZED: ["CANCELLED"],
  DISBURSED: ["DISBURSED", "CANCELLED"],
};

export const canTransitionLoanApplication = ({ fromStage = "", toStage = "", role = "" }) => {
  const from = String(fromStage || "").toUpperCase();
  const to = String(toStage || "").toUpperCase();
  const allowedTo = APPLICATION_TRANSITIONS[from] || [];
  if (!allowedTo.includes(to)) {
    return { ok: false, code: "INVALID_STATUS_TRANSITION", message: `Invalid status transition: ${from} -> ${to}` };
  }
  const roleKey = normalizeRole(role);
  const allowedActions = APPLICATION_ROLE_ACTIONS[roleKey] || [];
  if (!allowedActions.includes(to)) {
    return { ok: false, code: "ROLE_ACTION_FORBIDDEN", message: "Forbidden: this role cannot perform this action" };
  }
  return { ok: true };
};
