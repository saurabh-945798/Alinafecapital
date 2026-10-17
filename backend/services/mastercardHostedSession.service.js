import crypto from "crypto";
import mongoose from "mongoose";
import { LoanAccount } from "../models/LoanAccount.model.js";
import { MastercardPayment } from "../models/MastercardPayment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizeEmail, normalizePhone } from "../utils/normalize.js";
import {
  buildPaymentSummary,
  getNextPayableInstallment,
  applyPaymentSummaryToDoc,
  toMoney,
} from "./loanAccountSummary.service.js";
import {
  buildMastercardRestUrl,
  getMastercardConfig,
  getMastercardSessionScriptUrl,
  validateMastercardConfig,
} from "../config/mastercard.js";
import { buildGatewayStorageSnapshot, sanitizeForLog } from "../utils/paymentSecurity.js";

const normalizeGatewayHost = (value = "") => String(value || "").trim().replace(/\/+$/, "");

const basicAuthHeader = (config) => {
  const value = `merchant.${config.merchantId}:${config.apiPassword}`;
  return `Basic ${Buffer.from(value, "utf8").toString("base64")}`;
};

const generateSafeId = (prefix = "ACLR") => {
  const cleanPrefix =
    String(prefix || "ACLR")
      .toUpperCase()
      .replace(/[^A-Z0-9_-]/g, "")
      .slice(0, 8) || "ACLR";
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(3).toString("hex").toUpperCase();
  return `${cleanPrefix}-${stamp}-${rand}`;
};

const asJson = async (response) => {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
};

const sanitizeGatewayUrl = (url = "") =>
  String(url || "").replace(/(merchant\/)[^/]+/i, "$1***");

const toMpgsApiError = (error, fallbackMessage = "Mastercard gateway request failed") => {
  if (error instanceof ApiError) return error;

  const statusCode = Number(error?.status || 502);
  const payload = error?.payload || null;
  const gatewayMessage =
    payload?.error?.explanation ||
    payload?.error?.cause ||
    payload?.error?.field ||
    payload?.message ||
    error?.message ||
    fallbackMessage;

  return new ApiError(
    statusCode >= 500 ? 502 : statusCode,
    `Could not initiate Mastercard card repayment: ${gatewayMessage}`,
    error?.code || "MPGS_REQUEST_FAILED",
    {
      gatewayStatus: error?.status || null,
      gatewayUrl: error?.url ? sanitizeGatewayUrl(error.url) : null,
      gatewayError: sanitizeForLog(payload?.error || payload || null),
    }
  );
};

const getValidatedMastercardConfig = () => {
  const config = getMastercardConfig();

  if (!config.enabled) {
    return config;
  }

  try {
    validateMastercardConfig(config);
    return config;
  } catch (error) {
    throw new ApiError(
      503,
      error?.message ||
        "Mastercard repayment is not configured. Check MPGS_GATEWAY_HOST, MPGS_API_VERSION, MPGS_MERCHANT_ID and MPGS_API_PASSWORD in backend/.env.",
      error?.code || "MPGS_CONFIG_INCOMPLETE",
      {
        missing: error?.missing || [],
        invalid: error?.invalid || [],
        requiredEnv: [
          "MPGS_ENABLED",
          "MPGS_GATEWAY_HOST",
          "MPGS_API_VERSION",
          "MPGS_MERCHANT_ID",
          "MPGS_API_PASSWORD",
          "APP_BASE_URL",
          "MPGS_REPAYMENT_CURRENCY",
        ],
      }
    );
  }
};

const mpgsRequest = async ({ method = "GET", path, body, config }) => {
  const url = buildMastercardRestUrl(path, config);

  try {
    const response = await fetch(url, {
      method,
      headers: {
        Authorization: basicAuthHeader(config),
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(Number(process.env.MPGS_REQUEST_TIMEOUT_MS || 30000)),
    });

    const payload = await asJson(response);
    if (!response.ok) {
      const error = new Error(
        payload?.error?.explanation || payload?.error?.cause || payload?.message || "MPGS request failed"
      );
      error.code = "MPGS_REQUEST_FAILED";
      error.status = response.status;
      error.payload = payload;
      error.url = url;
      throw error;
    }

    return payload;
  } catch (error) {
    error.url = error.url || url;
    throw toMpgsApiError(error);
  }
};

const parseMpgsOutcome = (payload = {}) => {
  // Important: for order-status calls, top-level `result: SUCCESS` only means the
  // gateway returned the order successfully. It does NOT mean the payment was paid.
  // Payment success/failure must be determined from order.status, transaction.result,
  // response.gatewayCode, and authorized/captured amounts.
  const firstTransaction = Array.isArray(payload?.transaction) ? payload.transaction[0] : null;
  const firstResponse = firstTransaction?.response || null;

  const topResult = String(payload?.result || payload?.gatewayResult || "").toUpperCase();
  const orderStatus = String(payload?.status || payload?.order?.status || firstTransaction?.order?.status || "").toUpperCase();
  const transactionResult = String(firstTransaction?.result || "").toUpperCase();
  const responseGatewayCode = String(payload?.response?.gatewayCode || "").toUpperCase();
  const firstGatewayCode = String(firstResponse?.gatewayCode || "").toUpperCase();
  const gatewayCode = firstGatewayCode || responseGatewayCode;

  const acquirerMessage =
    firstResponse?.acquirerMessage ||
    payload?.response?.acquirerMessage ||
    payload?.error?.explanation ||
    payload?.error?.cause ||
    payload?.message ||
    "";

  const responseCode =
    firstResponse?.acquirerCode ||
    firstTransaction?.authorizationResponse?.responseCode ||
    payload?.response?.acquirerCode ||
    gatewayCode ||
    "";

  const receipt = firstTransaction?.transaction?.receipt || payload?.receipt || "";
  const authorizationCode =
    payload?.authorizationResponse?.transactionIdentifier ||
    payload?.authorizationResponse?.posData ||
    firstTransaction?.authorizationResponse?.transactionIdentifier ||
    firstTransaction?.transaction?.authorizationCode ||
    "";

  const totalAuthorized = Number(payload?.totalAuthorizedAmount || payload?.order?.totalAuthorizedAmount || firstTransaction?.order?.totalAuthorizedAmount || 0);
  const totalCaptured = Number(payload?.totalCapturedAmount || payload?.order?.totalCapturedAmount || firstTransaction?.order?.totalCapturedAmount || 0);
  const txAmount = Number(firstTransaction?.transaction?.amount || 0);

  const failedCodes = new Set(["FAILED", "FAILURE", "DECLINED", "CANCELLED", "ERROR", "REJECTED", "TIMED_OUT", "EXPIRED"]);
  const successOrderStatuses = new Set(["CAPTURED", "AUTHORIZED", "PAID", "PAYMENT_SUCCESSFUL", "PARTIALLY_CAPTURED"]);
  const successGatewayCodes = new Set(["APPROVED", "AUTHORIZED", "CAPTURED"]);

  const hasFailureSignal =
    failedCodes.has(orderStatus) ||
    failedCodes.has(transactionResult) ||
    failedCodes.has(gatewayCode) ||
    firstResponse?.gatewayRecommendation === "RESUBMIT_WITH_ALTERNATIVE_PAYMENT_DETAILS";

  if (hasFailureSignal) {
    return {
      status: gatewayCode === "CANCELLED" || orderStatus === "CANCELLED" ? "CANCELLED" : "FAILED",
      gatewayResult: orderStatus || transactionResult || gatewayCode || topResult || "FAILED",
      gatewayMessage: acquirerMessage || "Payment was declined. Please try another card or payment method.",
      receipt: "",
      authorizationCode: "",
      responseCode,
    };
  }

  const hasSuccessSignal =
    successOrderStatuses.has(orderStatus) ||
    successGatewayCodes.has(gatewayCode) ||
    ((transactionResult === "SUCCESS" || topResult === "SUCCESS") && (totalAuthorized > 0 || totalCaptured > 0 || txAmount > 0) && !orderStatus);

  if (hasSuccessSignal) {
    return {
      status: "PAID",
      gatewayResult: orderStatus || gatewayCode || transactionResult || topResult || "SUCCESS",
      gatewayMessage: acquirerMessage || "Payment approved",
      receipt,
      authorizationCode,
      responseCode,
    };
  }

  return {
    status: "UNKNOWN",
    gatewayResult: orderStatus || transactionResult || gatewayCode || topResult || "UNKNOWN",
    gatewayMessage: acquirerMessage || "Payment status could not be confirmed",
    receipt: "",
    authorizationCode: "",
    responseCode,
  };
};
const belongsToUser = (account, user) => {
  if (!account || !user) return false;
  const userEmail = normalizeEmail(user.email || "");
  const userPhone = normalizePhone(user.phone || "");
  const accountEmail = normalizeEmail(account.email || "");
  const accountPhone = normalizePhone(account.phone || "");

  return Boolean(
    (userEmail && accountEmail && userEmail === accountEmail) ||
      (userPhone && accountPhone && userPhone === accountPhone)
  );
};

const resolveAccountForUser = async ({ accountId, user }) => {
  if (!mongoose.Types.ObjectId.isValid(accountId)) {
    throw new ApiError(400, "Invalid loan account id", "VALIDATION_ERROR");
  }

  const account = await LoanAccount.findById(accountId);
  if (!account) throw new ApiError(404, "Loan account not found", "ACCOUNT_NOT_FOUND");

  if (!belongsToUser(account, user)) {
    throw new ApiError(403, "You are not allowed to repay this loan account", "FORBIDDEN");
  }

  return account;
};

const resolveRepaymentAmount = ({ account, requestedAmount, repaymentType, repaymentMonth, config }) => {
  const summary = buildPaymentSummary(account);
  const outstanding = toMoney(summary.outstandingBalance || 0);
  if (outstanding <= 0) {
    throw new ApiError(400, "This loan account has no outstanding balance", "NO_OUTSTANDING_BALANCE");
  }

  let amount = toMoney(requestedAmount);
  let type = repaymentType || "custom";

  if (type === "full_settlement") {
    amount = outstanding;
  }

  if (type === "next_due") {
    const nextInstallment = repaymentMonth
      ? summary.schedule.find((row) => Number(row.month) === Number(repaymentMonth))
      : getNextPayableInstallment(account);
    amount = toMoney(nextInstallment?.remainingAmount || nextInstallment?.installment || 0);
  }

  const min = Number(config.minRepaymentAmount || 0);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new ApiError(400, "Repayment amount is required", "INVALID_REPAYMENT_AMOUNT");
  }
  if (min > 0 && amount < min) {
    throw new ApiError(400, `Repayment amount must be at least ${min}`, "MIN_REPAYMENT_AMOUNT");
  }
  if (amount > outstanding) {
    throw new ApiError(400, "Repayment amount cannot exceed the outstanding loan balance", "AMOUNT_EXCEEDS_OUTSTANDING");
  }
  if (config.maxRepaymentAmount > 0 && amount > config.maxRepaymentAmount) {
    throw new ApiError(400, `Repayment amount cannot exceed ${config.maxRepaymentAmount}`, "MAX_REPAYMENT_AMOUNT");
  }

  return { amount, outstanding, summary, repaymentType: type };
};

const buildCreateSessionBody = () => ({
  // Hosted Session session creation should stay minimal.
  // Payment/order/customer details are submitted later in the PAY transaction.
  // Some MPGS profiles reject Hosted Checkout-style interaction fields such as
  // interaction.merchant.url on the /session endpoint with "Unexpected parameter".
  session: {
    authenticationLimit: 10,
  },
});

const recordRepaymentOnAccount = async (payment) => {
  if (payment.recordedRepaymentEntryId) return;

  const account = await LoanAccount.findById(payment.accountId);
  if (!account) throw new ApiError(404, "Loan account not found while recording payment", "ACCOUNT_NOT_FOUND");

  account.repaymentEntries = Array.isArray(account.repaymentEntries) ? account.repaymentEntries : [];
  account.repaymentEntries.push({
    paymentDate: payment.paidAt || new Date(),
    amount: Number(payment.amount || 0),
    method: "card",
    reference: payment.gatewayReceipt || payment.merchantOrderId,
    note: `Card repayment via Mastercard. Order: ${payment.merchantOrderId}`,
    recordedAt: new Date(),
  });
  const entry = account.repaymentEntries[account.repaymentEntries.length - 1];

  applyPaymentSummaryToDoc(account);
  await account.save();

  payment.recordedRepaymentEntryId = entry?._id || null;
  payment.recordedAt = new Date();
  await payment.save();
};

export const mastercardHostedSessionService = {
  async createLoanRepaymentSession({ accountId, amount, repaymentType = "custom", repaymentMonth = null, user }) {
    const config = getValidatedMastercardConfig();
    if (!config.enabled) {
      throw new ApiError(503, "Mastercard repayments are currently disabled", "MPGS_DISABLED");
    }

    const account = await resolveAccountForUser({ accountId, user });
    const resolved = resolveRepaymentAmount({
      account,
      requestedAmount: amount,
      repaymentType,
      repaymentMonth,
      config,
    });

    const currency = String(config.currency || "MWK").toUpperCase();
    const merchantOrderId = generateSafeId(config.orderPrefix);
    const transactionId = generateSafeId("TXN");
    const description = `${config.transactionDescription} - ${account.accountNumber || merchantOrderId}`;

    const payment = new MastercardPayment({
      purpose: "loan_repayment",
      accountId: account._id,
      accountNumber: account.accountNumber || "",
      applicationCode: account.applicationCode || "",
      inquiryId: account.inquiryId || null,
      userId: user?._id || null,
      customerName: account.customerName || user?.fullName || "",
      customerEmail: account.email || user?.email || "",
      customerPhone: account.phone || user?.phone || "",
      amount: resolved.amount,
      currency,
      description,
      repaymentMonth: repaymentMonth ? Number(repaymentMonth) : null,
      repaymentType: resolved.repaymentType,
      merchantOrderId,
      transactionId,
      gatewayHost: normalizeGatewayHost(config.gatewayHost),
      gatewayVersion: config.apiVersion,
      merchantId: config.merchantId,
    });

    const createPayload = buildCreateSessionBody();
    // This payload intentionally contains no cardholder data.
    payment.createdPayload = sanitizeForLog(createPayload);

    const createSessionResponse = await mpgsRequest({
      method: "POST",
      path: "/session",
      body: createPayload,
      config,
    });

    const sessionId = createSessionResponse?.session?.id || createSessionResponse?.id || "";
    if (!sessionId) {
      throw new ApiError(502, "Mastercard did not return a session id", "MPGS_SESSION_ID_MISSING");
    }

    payment.sessionId = sessionId;
    payment.createSessionResponse = buildGatewayStorageSnapshot(createSessionResponse);
    await payment.save();

    return this.toClient(payment, { scriptUrl: getMastercardSessionScriptUrl(config) });
  },

  async getPaymentForClient(paymentId, user = null) {
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      throw new ApiError(400, "Invalid payment id", "VALIDATION_ERROR");
    }
    const payment = await MastercardPayment.findById(paymentId).lean();
    if (!payment) throw new ApiError(404, "Payment session not found", "PAYMENT_NOT_FOUND");

    if (user?._id && String(payment.userId || "") && String(payment.userId) !== String(user._id)) {
      throw new ApiError(403, "You are not allowed to view this payment", "FORBIDDEN");
    }

    const config = getValidatedMastercardConfig();
    return this.toClient(payment, { scriptUrl: getMastercardSessionScriptUrl(config) });
  },

  async refreshFormSession(paymentId, user = null) {
    const config = getValidatedMastercardConfig();

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      throw new ApiError(400, "Invalid payment id", "VALIDATION_ERROR");
    }

    const payment = await MastercardPayment.findById(paymentId);
    if (!payment) throw new ApiError(404, "Payment session not found", "PAYMENT_NOT_FOUND");

    if (user?._id && String(payment.userId || "") && String(payment.userId) !== String(user._id)) {
      throw new ApiError(403, "You are not allowed to refresh this payment", "FORBIDDEN");
    }

    if (payment.status === "PAID") {
      await recordRepaymentOnAccount(payment);
      return this.toClient(payment, { scriptUrl: getMastercardSessionScriptUrl(config) });
    }

    const createPayload = buildCreateSessionBody();
    const createSessionResponse = await mpgsRequest({
      method: "POST",
      path: "/session",
      body: createPayload,
      config,
    });

    const sessionId = createSessionResponse?.session?.id || createSessionResponse?.id || "";
    if (!sessionId) {
      throw new ApiError(502, "Mastercard did not return a new session id", "MPGS_SESSION_ID_MISSING");
    }

    payment.sessionId = sessionId;
    // A refreshed card form is a fresh retry. Use a fresh transaction reference so
    // a declined/expired attempt is not retried with the same transaction id.
    if (["FAILED", "CANCELLED", "UNKNOWN", "PAYMENT_PROCESSING"].includes(payment.status)) {
      payment.transactionId = generateSafeId("TXN");
    }
    payment.createSessionResponse = buildGatewayStorageSnapshot(createSessionResponse);
    payment.createdPayload = sanitizeForLog(createPayload);
    payment.status = "SESSION_CREATED";
    payment.gatewayResult = "";
    payment.gatewayMessage = "";
    payment.gatewayReceipt = "";
    payment.gatewayAuthorizationCode = "";
    payment.gatewayResponseCode = "";
    payment.paidAt = null;
    payment.failedAt = null;
    await payment.save();

    return this.toClient(payment, { scriptUrl: getMastercardSessionScriptUrl(config) });
  },

  async processPayment({ paymentId, sessionId, user = null }) {
    const config = getValidatedMastercardConfig();

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      throw new ApiError(400, "Invalid payment id", "VALIDATION_ERROR");
    }
    const payment = await MastercardPayment.findById(paymentId);
    if (!payment) throw new ApiError(404, "Payment session not found", "PAYMENT_NOT_FOUND");

    if (user?._id && String(payment.userId || "") && String(payment.userId) !== String(user._id)) {
      throw new ApiError(403, "You are not allowed to process this payment", "FORBIDDEN");
    }

    if (payment.status === "PAID") {
      await recordRepaymentOnAccount(payment);
      return this.toClient(payment, { scriptUrl: getMastercardSessionScriptUrl(config) });
    }

    if (sessionId && String(sessionId) !== String(payment.sessionId)) {
      throw new ApiError(400, "Session mismatch. Please restart the payment.", "MPGS_SESSION_MISMATCH");
    }

    payment.status = "PAYMENT_PROCESSING";
    await payment.save();

    const payPayload = {
      apiOperation: "PAY",
      order: {
        amount: payment.amount.toFixed(2),
        currency: payment.currency,
        description: payment.description,
        reference: payment.accountNumber || payment.merchantOrderId,
      },
      session: {
        id: payment.sessionId,
      },
      sourceOfFunds: {
        type: "CARD",
      },
      transaction: {
        reference: payment.transactionId,
      },
    };

    const payResponse = await mpgsRequest({
      method: "PUT",
      path: `/order/${encodeURIComponent(payment.merchantOrderId)}/transaction/${encodeURIComponent(payment.transactionId)}`,
      body: payPayload,
      config,
    });

    const outcome = parseMpgsOutcome(payResponse);
    // Store only payment status/reference fields. Never store raw card/sourceOfFunds data.
    payment.payResponse = buildGatewayStorageSnapshot(payResponse);
    payment.status = outcome.status;
    payment.gatewayResult = outcome.gatewayResult;
    payment.gatewayMessage = outcome.gatewayMessage;
    payment.gatewayReceipt = outcome.receipt;
    payment.gatewayAuthorizationCode = outcome.authorizationCode;
    payment.gatewayResponseCode = outcome.responseCode;
    if (outcome.status === "PAID") payment.paidAt = new Date();
    if (["FAILED", "CANCELLED", "UNKNOWN"].includes(outcome.status)) payment.failedAt = new Date();
    await payment.save();

    if (outcome.status === "PAID") {
      await recordRepaymentOnAccount(payment);
    }

    return this.toClient(payment, { scriptUrl: getMastercardSessionScriptUrl(config) });
  },

  async refreshOrderStatus(paymentId, user = null) {
    const config = getValidatedMastercardConfig();
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      throw new ApiError(400, "Invalid payment id", "VALIDATION_ERROR");
    }
    const payment = await MastercardPayment.findById(paymentId);
    if (!payment) throw new ApiError(404, "Payment session not found", "PAYMENT_NOT_FOUND");

    if (user?._id && String(payment.userId || "") && String(payment.userId) !== String(user._id)) {
      throw new ApiError(403, "You are not allowed to view this payment", "FORBIDDEN");
    }

    const orderStatus = await mpgsRequest({
      method: "GET",
      path: `/order/${encodeURIComponent(payment.merchantOrderId)}`,
      config,
    });

    const outcome = parseMpgsOutcome(orderStatus);
    // Store only payment status/reference fields. Never store raw card/sourceOfFunds data.
    payment.orderStatusResponse = buildGatewayStorageSnapshot(orderStatus);
    payment.status = outcome.status;
    payment.gatewayResult = outcome.gatewayResult;
    payment.gatewayMessage = outcome.gatewayMessage;
    payment.gatewayReceipt = outcome.receipt || payment.gatewayReceipt;
    payment.gatewayAuthorizationCode = outcome.authorizationCode || payment.gatewayAuthorizationCode;
    payment.gatewayResponseCode = outcome.responseCode || payment.gatewayResponseCode;
    if (outcome.status === "PAID" && !payment.paidAt) payment.paidAt = new Date();
    if (["FAILED", "CANCELLED", "UNKNOWN"].includes(outcome.status) && !payment.failedAt) payment.failedAt = new Date();
    await payment.save();

    if (outcome.status === "PAID") {
      await recordRepaymentOnAccount(payment);
    }

    return this.toClient(payment, { scriptUrl: getMastercardSessionScriptUrl(config) });
  },

  toClient(paymentInput, { scriptUrl = "" } = {}) {
    const payment = paymentInput?.toObject ? paymentInput.toObject() : paymentInput;
    return {
      paymentId: String(payment._id),
      purpose: payment.purpose || "loan_repayment",
      accountId: String(payment.accountId || ""),
      accountNumber: payment.accountNumber || "",
      applicationCode: payment.applicationCode || "",
      customerName: payment.customerName || "",
      customerEmail: payment.customerEmail || "",
      customerPhone: payment.customerPhone || "",
      amount: payment.amount,
      currency: payment.currency,
      description: payment.description,
      repaymentMonth: payment.repaymentMonth || null,
      repaymentType: payment.repaymentType || "custom",
      status: payment.status,
      gatewayResult: payment.gatewayResult || "",
      gatewayMessage: payment.gatewayMessage || "",
      gatewayReceipt: payment.gatewayReceipt || "",
      gatewayAuthorizationCode: payment.gatewayAuthorizationCode || "",
      gatewayResponseCode: payment.gatewayResponseCode || "",
      session: {
        id: payment.sessionId,
        scriptUrl,
      },
      order: {
        id: payment.merchantOrderId,
        transactionId: payment.transactionId,
      },
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      paidAt: payment.paidAt,
      recordedAt: payment.recordedAt || null,
    };
  },
};
