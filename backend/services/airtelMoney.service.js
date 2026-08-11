import crypto from "crypto";
import mongoose from "mongoose";
import { getAirtelConfig, buildAirtelUrl, validateAirtelConfig } from "../config/airtel.js";
import { LoanAccount } from "../models/LoanAccount.model.js";
import { AirtelPayment } from "../models/AirtelPayment.model.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizeEmail, normalizePhone } from "../utils/normalize.js";
import {
  buildPaymentSummary,
  getNextPayableInstallment,
  applyPaymentSummaryToDoc,
  toMoney,
} from "./loanAccountSummary.service.js";

let cachedToken = null;
let cachedTokenExpiresAt = 0;

const normalizeGatewayHost = (value = "") => String(value || "").trim().replace(/\/+$/, "");

const toAlphanumeric = (value = "") => String(value || "").toUpperCase().replace(/[^A-Z0-9]/g, "");

const generateSafeId = (prefix = "ACLA") => {
  const cleanPrefix = toAlphanumeric(prefix || "ACLA").slice(0, 8) || "ACLA";
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = crypto.randomBytes(4).toString("hex").toUpperCase();

  // Airtel Malawi rejects references containing hyphens/symbols and requires max 64 characters.
  // Keep transaction IDs alphanumeric as well so they are safe for collection and status checks.
  return `${cleanPrefix}${stamp}${rand}`.slice(0, 64);
};

const buildAirtelReference = ({ accountNumber = "", transactionId = "" } = {}) => {
  const cleanAccount = toAlphanumeric(accountNumber || "LOAN").slice(0, 24) || "LOAN";
  const cleanTransaction = toAlphanumeric(transactionId).slice(0, 40);
  const reference = `${cleanAccount}${cleanTransaction}`.slice(0, 64);
  return reference || generateSafeId("ACLA");
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

const sanitizeAirtelUrl = (url = "") => String(url || "").replace(/(token=|access_token=)[^&]+/gi, "$1***");

const maskPhone = (value = "") => {
  const digits = String(value || "").replace(/\D/g, "");
  if (digits.length <= 4) return digits;
  return `${digits.slice(0, 3)}*****${digits.slice(-3)}`;
};

const sanitizePayload = (value) => {
  if (Array.isArray(value)) return value.map(sanitizePayload);
  if (!value || typeof value !== "object") return value;

  const output = {};
  for (const [key, item] of Object.entries(value)) {
    const lower = key.toLowerCase();
    if (["access_token", "token", "client_secret", "pin", "password", "secret"].includes(lower)) {
      output[key] = "***";
    } else if (["msisdn", "phone", "airtelphone"].includes(lower)) {
      output[key] = maskPhone(item);
    } else {
      output[key] = sanitizePayload(item);
    }
  }
  return output;
};

const toAirtelApiError = (error, fallbackMessage = "Airtel Money request failed") => {
  if (error instanceof ApiError) return error;

  const statusCode = Number(error?.status || 502);
  const payload = error?.payload || null;
  const gatewayMessage =
    payload?.message ||
    payload?.error_description ||
    payload?.error ||
    payload?.data?.message ||
    payload?.status?.message ||
    error?.message ||
    fallbackMessage;

  return new ApiError(
    statusCode >= 500 ? 502 : statusCode,
    `Could not initiate Airtel Money repayment: ${gatewayMessage}`,
    error?.code || "AIRTEL_REQUEST_FAILED",
    {
      gatewayStatus: error?.status || null,
      gatewayUrl: error?.url ? sanitizeAirtelUrl(error.url) : null,
      gatewayError: sanitizePayload(payload?.error || payload || null),
    }
  );
};

const getValidatedAirtelConfig = () => {
  const config = getAirtelConfig();
  if (!config.enabled) return config;

  try {
    validateAirtelConfig(config);
    return config;
  } catch (error) {
    throw new ApiError(
      503,
      error?.message || "Airtel Money repayment is not configured. Check Airtel settings in backend/.env.",
      error?.code || "AIRTEL_CONFIG_INCOMPLETE",
      {
        missing: error?.missing || [],
        invalid: error?.invalid || [],
        requiredEnv: [
          "AIRTEL_ENABLED",
          "AIRTEL_BASE_URL",
          "AIRTEL_CLIENT_ID",
          "AIRTEL_CLIENT_SECRET or AIRTEL_API_KEY",
          "AIRTEL_COUNTRY",
          "AIRTEL_CURRENCY",
        ],
      }
    );
  }
};

const airtelHeaders = (config, accessToken = "") => {
  const headers = {
    "Content-Type": "application/json",
    Accept: "*/*",
    "X-Country": config.country,
    "X-Currency": config.currency,
  };

  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  if (config.apiKey && config.apiKeyHeaderName) headers[config.apiKeyHeaderName] = config.apiKey;
  return headers;
};

const airtelAuthHeaders = () => ({
  "Content-Type": "application/json",
  Accept: "*/*",
});

const isInvalidClientPayload = (payload = {}) => {
  const text = JSON.stringify(payload || {}).toLowerCase();
  return text.includes("invalid_client") || text.includes("invalid client");
};

const buildInvalidClientError = (config, payload, url) => {
  const isUat = /openapiuat/i.test(config.baseUrl);
  const isLive = /openapi\.airtel\.africa/i.test(config.baseUrl) && !isUat;
  const environmentHint = isUat
    ? "Airtel rejected the token request on UAT. If these are live credentials, change AIRTEL_ENV=live and AIRTEL_BASE_URL=https://openapi.airtel.africa. If these are UAT credentials, confirm the Client ID and Client Secret from the Airtel developer portal."
    : isLive
      ? "Airtel rejected the token request on LIVE. Confirm the live Client ID and Client Secret are enabled for Malawi collections."
      : "Airtel rejected the token request. Confirm the API base URL belongs to the same environment as the credentials.";

  const error = new Error(environmentHint);
  error.code = "AIRTEL_INVALID_CLIENT";
  error.status = 400;
  error.payload = {
    error: payload?.error || "invalid_client",
    message: payload?.message || payload?.error_description || environmentHint,
  };
  error.url = url;
  return error;
};

const airtelRequest = async ({ method = "GET", path, body, config, token = "" }) => {
  const url = buildAirtelUrl(path, config);
  try {
    const response = await fetch(url, {
      method,
      headers: airtelHeaders(config, token),
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(Number(config.requestTimeoutMs || 30000)),
    });

    const payload = await asJson(response);
    if (!response.ok) {
      const error = new Error(payload?.message || payload?.error_description || payload?.error || "Airtel request failed");
      error.code = "AIRTEL_REQUEST_FAILED";
      error.status = response.status;
      error.payload = payload;
      error.url = url;
      throw error;
    }

    return payload;
  } catch (error) {
    error.url = error.url || url;
    throw toAirtelApiError(error);
  }
};

const airtelAuthRequest = async (config) => {
  const url = buildAirtelUrl(config.authPath, config);
  const body = {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: "client_credentials",
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: airtelAuthHeaders(),
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(Number(config.requestTimeoutMs || 30000)),
    });
    const payload = await asJson(response);

    if (!response.ok) {
      if (isInvalidClientPayload(payload)) throw buildInvalidClientError(config, payload, url);
      const error = new Error(payload?.message || payload?.error_description || payload?.error || "Airtel authentication failed");
      error.code = "AIRTEL_AUTH_FAILED";
      error.status = response.status;
      error.payload = payload;
      error.url = url;
      throw error;
    }

    return payload;
  } catch (error) {
    error.url = error.url || url;
    throw toAirtelApiError(error, "Airtel Money authentication failed");
  }
};

const getAccessToken = async (config, { forceRefresh = false } = {}) => {
  const now = Date.now();
  if (!forceRefresh && cachedToken && now < cachedTokenExpiresAt) return cachedToken;

  if (config.authMode === "none") {
    return "";
  }

  const payload = await airtelAuthRequest(config);

  const token = payload?.access_token || payload?.data?.access_token || payload?.token || "";
  if (!token) {
    throw new ApiError(502, "Airtel Money did not return an access token", "AIRTEL_TOKEN_MISSING");
  }

  const expiresIn = Number(payload?.expires_in || payload?.data?.expires_in || 3600);
  cachedToken = token;
  cachedTokenExpiresAt = Date.now() + Math.max(60, expiresIn - 60) * 1000;
  return token;
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

  if (type === "full_settlement") amount = outstanding;

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

const normalizeMsisdn = (value = "", config = {}) => {
  const raw = String(value || "").trim();
  const digits = raw.replace(/\D/g, "");
  if (!digits) return { msisdn: "", display: "", original: raw, format: "empty" };

  const country = String(config.country || "MW").toUpperCase();
  const mode = String(config.msisdnFormat || "national").toLowerCase();

  if (country !== "MW") {
    return { msisdn: digits, display: digits, original: raw, format: "digits" };
  }

  // Malawi Airtel collection prompts are usually most reliable when the subscriber
  // number is sent without the leading zero/country code because X-Country=MW is
  // already included in the API headers. Accept common user inputs and normalize.
  let national = digits;
  if (national.startsWith("265") && national.length === 12) national = national.slice(3);
  if (national.startsWith("0") && national.length === 10) national = national.slice(1);

  if (!/^\d{9}$/.test(national)) {
    return { msisdn: "", display: digits, original: raw, format: "invalid" };
  }

  const msisdn = mode === "local" ? `0${national}` : mode === "e164" ? `265${national}` : national;
  const display = `0${national}`;

  return {
    msisdn,
    display,
    original: raw,
    format: mode === "local" ? "local-leading-zero" : mode === "e164" ? "country-code" : "national-no-leading-zero",
  };
};

const isPaidStatus = (value = "") => {
  const text = String(value || "").trim().toUpperCase();
  return ["TS", "SUCCESS", "SUCCESSFUL", "COMPLETED", "COMPLETE", "PAID", "APPROVED"].includes(text);
};

const isFailedStatus = (value = "") => {
  const text = String(value || "").trim().toUpperCase();
  return [
    "TF",
    "FAILED",
    "FAILURE",
    "DECLINED",
    "REJECTED",
    "EXPIRED",
    "CANCELLED",
    "CANCELED",
    "CANCEL",
    "TIMEOUT",
    "TIMED_OUT",
    "NOT_COMPLETED",
    "INSUFFICIENT_FUNDS",
  ].includes(text);
};

const hasSuccessfulPaymentMessage = (value = "") =>
  /\b(successful|completed|approved|paid|received)\b/i.test(String(value || ""));

const hasFailurePaymentMessage = (value = "") =>
  /\b(fail(?:ed|ure)?|declin(?:ed|e)|reject(?:ed)?|cancel(?:led|ed)?|expire(?:d)?|timeout|timed out|not completed|insufficient|reversal)\b/i.test(
    String(value || "")
  );

const isPendingStatus = (value = "") => {
  const text = String(value || "").trim().toUpperCase();
  return ["TIP", "TP", "TA", "PENDING", "IN_PROGRESS", "PROCESSING", "INITIATED", "WAITING"].includes(text);
};

const getAirtelTransactionPayload = (payload = {}) =>
  payload?.data?.transaction ||
  payload?.transaction ||
  payload?.response?.transaction ||
  payload?.data?.response?.transaction ||
  null;

const extractStatusParts = (payload = {}) => {
  const tx = getAirtelTransactionPayload(payload);
  const data = payload?.data && typeof payload.data === "object" ? payload.data : {};

  // Important: payload.status.success / payload.status.message normally means
  // Airtel accepted the API request. It does NOT mean the customer has approved
  // the phone prompt. Only transaction-level fields should mark a repayment paid.
  const transactionStatus =
    tx?.status ||
    tx?.status_code ||
    tx?.state ||
    tx?.result ||
    data?.transactionStatus ||
    payload?.transactionStatus ||
    "";

  const transactionMessage =
    tx?.message ||
    tx?.status_message ||
    tx?.description ||
    data?.transactionMessage ||
    data?.status_message ||
    data?.description ||
    "";

  const statusMessage =
    payload?.status?.message ||
    payload?.status?.description ||
    payload?.status?.response_message ||
    "";

  const gatewayMessage =
    transactionMessage ||
    payload?.message ||
    data?.message ||
    statusMessage ||
    payload?.error_description ||
    payload?.error ||
    "";

  return {
    rawStatus: transactionStatus,
    message: gatewayMessage,
    transactionMessage,
    hasTransactionLevelStatus: Boolean(transactionStatus || transactionMessage || tx),
    airtelMoneyId: tx?.airtel_money_id || tx?.airtelMoneyId || data?.airtel_money_id || payload?.airtel_money_id || "",
    responseCode: tx?.status_code || data?.status_code || payload?.status?.code || payload?.code || "",
  };
};

const parseAirtelOutcome = (payload = {}, { phase = "status" } = {}) => {
  const parts = extractStatusParts(payload);
  const rawStatus = String(parts.rawStatus || "").trim();
  const rawMessage = String(parts.message || "").trim();
  const transactionMessage = String(parts.transactionMessage || "").trim();

  // Creating an Airtel collection can return HTTP 201 and messages such as
  // success/accepted even before the customer enters their PIN. Treat initiation
  // as pending until a status check or callback confirms the transaction result.
  if (phase === "initiate") {
    return {
      status: "PENDING",
      gatewayResult: rawStatus || "PENDING",
      gatewayMessage: "Airtel Money prompt sent. Waiting for customer approval.",
      airtelMoneyId: parts.airtelMoneyId,
      responseCode: parts.responseCode,
    };
  }

  const combinedMessage = [transactionMessage, rawMessage].filter(Boolean).join(" ");

  // A payment should only reduce the loan balance after Airtel confirms a genuine
  // transaction-level success. Do not treat general API acknowledgements as paid.
  if (parts.hasTransactionLevelStatus && (isPaidStatus(rawStatus) || hasSuccessfulPaymentMessage(transactionMessage))) {
    return {
      status: "PAID",
      gatewayResult: rawStatus || "SUCCESS",
      gatewayMessage: transactionMessage || rawMessage || "Airtel Money payment received",
      airtelMoneyId: parts.airtelMoneyId,
      responseCode: parts.responseCode,
    };
  }

  // If the customer cancels/declines the phone prompt, Airtel may send the wording
  // in status.message or data.message rather than transaction.status. Treat those
  // explicit failure words as final unsuccessful outcomes and keep balance unchanged.
  if (isFailedStatus(rawStatus) || hasFailurePaymentMessage(combinedMessage)) {
    const cancelled = /cancel/i.test(combinedMessage) || String(rawStatus || "").toUpperCase().includes("CANCEL");
    return {
      status: cancelled ? "CANCELLED" : "FAILED",
      gatewayResult: rawStatus || (cancelled ? "CANCELLED" : "FAILED"),
      gatewayMessage: transactionMessage || rawMessage || "Airtel Money payment was not successful. Your balance has not changed.",
      airtelMoneyId: parts.airtelMoneyId,
      responseCode: parts.responseCode,
    };
  }

  if (isPendingStatus(rawStatus) || /pending|progress|processing|initiated|wait/i.test(transactionMessage || rawMessage)) {
    return {
      status: "PENDING",
      gatewayResult: rawStatus || "PENDING",
      gatewayMessage: rawMessage || "Airtel Money prompt sent. Waiting for customer approval.",
      airtelMoneyId: parts.airtelMoneyId,
      responseCode: parts.responseCode,
    };
  }

  return {
    status: "PENDING",
    gatewayResult: rawStatus || "PENDING",
    gatewayMessage: rawMessage || "Airtel Money prompt sent. Waiting for customer approval.",
    airtelMoneyId: parts.airtelMoneyId,
    responseCode: parts.responseCode,
  };
};

const recordRepaymentOnAccount = async (payment) => {
  if (payment.recordedRepaymentEntryId) return;

  const account = await LoanAccount.findById(payment.accountId);
  if (!account) throw new ApiError(404, "Loan account not found while recording payment", "ACCOUNT_NOT_FOUND");

  account.repaymentEntries = Array.isArray(account.repaymentEntries) ? account.repaymentEntries : [];
  account.repaymentEntries.push({
    paymentDate: payment.paidAt || new Date(),
    amount: Number(payment.amount || 0),
    method: "mobile_money",
    reference: payment.airtelMoneyId || payment.transactionId || payment.reference,
    note: `Airtel Money repayment. Reference: ${payment.reference}`,
    recordedAt: new Date(),
  });
  const entry = account.repaymentEntries[account.repaymentEntries.length - 1];

  applyPaymentSummaryToDoc(account);
  await account.save();

  payment.recordedRepaymentEntryId = entry?._id || null;
  payment.recordedAt = new Date();
  await payment.save();
};

export const airtelMoneyService = {
  async testAuthentication() {
    const config = getValidatedAirtelConfig();
    const token = await getAccessToken(config, { forceRefresh: true });
    return {
      ok: true,
      baseUrl: normalizeGatewayHost(config.baseUrl),
      authPath: config.authPath,
      country: config.country,
      currency: config.currency,
      tokenPreview: token ? `${token.slice(0, 8)}...${token.slice(-4)}` : "not-required",
      tokenExpiresAt: cachedTokenExpiresAt ? new Date(cachedTokenExpiresAt).toISOString() : null,
    };
  },

  async createLoanRepaymentCollection({ accountId, amount, repaymentType = "custom", repaymentMonth = null, airtelPhone, user }) {
    const config = getValidatedAirtelConfig();
    if (!config.enabled) {
      throw new ApiError(503, "Airtel Money repayments are currently disabled", "AIRTEL_DISABLED");
    }

    const normalizedPhone = normalizeMsisdn(airtelPhone || user?.phone || "", config);
    const msisdn = normalizedPhone.msisdn;
    if (!msisdn) {
      throw new ApiError(
        400,
        "Please enter a valid Airtel Money number. For Malawi, you may enter it as 0999 000 000, 999 000 000 or 265999000000.",
        "AIRTEL_PHONE_REQUIRED",
        { suppliedFormat: normalizedPhone.format || "invalid" }
      );
    }

    const account = await resolveAccountForUser({ accountId, user });
    const resolved = resolveRepaymentAmount({ account, requestedAmount: amount, repaymentType, repaymentMonth, config });

    const transactionId = generateSafeId(config.transactionPrefix);
    const reference = buildAirtelReference({ accountNumber: account.accountNumber, transactionId });
    const description = `Alinafe Capital loan repayment - ${account.accountNumber || transactionId}`;

    const requestPayload = {
      reference,
      subscriber: {
        country: config.country,
        currency: config.currency,
        msisdn,
      },
      transaction: {
        amount: resolved.amount,
        country: config.country,
        currency: config.currency,
        id: transactionId,
      },
    };

    const payment = new AirtelPayment({
      purpose: "loan_repayment",
      accountId: account._id,
      accountNumber: account.accountNumber || "",
      applicationCode: account.applicationCode || "",
      inquiryId: account.inquiryId || null,
      userId: user?._id || null,
      customerName: account.customerName || user?.fullName || "",
      customerEmail: account.email || user?.email || "",
      customerPhone: account.phone || user?.phone || "",
      airtelPhone: msisdn,
      gatewayMessage: `Prompt requested for ${normalizedPhone.display || msisdn}. Waiting for customer approval.`,
      amount: resolved.amount,
      currency: config.currency,
      country: config.country,
      description,
      repaymentMonth: repaymentMonth ? Number(repaymentMonth) : null,
      repaymentType: resolved.repaymentType,
      gatewayHost: normalizeGatewayHost(config.baseUrl),
      merchantWalletNumber: config.walletNumber,
      reference,
      transactionId,
      status: "INITIATED",
      requestPayload: sanitizePayload(requestPayload),
    });

    const token = await getAccessToken(config);
    const initiateResponse = await airtelRequest({
      method: "POST",
      path: config.collectionPath,
      config,
      token,
      body: requestPayload,
    });

    const outcome = parseAirtelOutcome(initiateResponse, { phase: "initiate" });
    payment.initiateResponse = sanitizePayload(initiateResponse);
    payment.status = "PENDING";
    payment.gatewayResult = outcome.gatewayResult || "PENDING";
    payment.gatewayMessage =
      outcome.gatewayMessage ||
      `Airtel Money prompt sent to ${normalizedPhone.display || msisdn}. Waiting for customer approval.`;
    payment.airtelMoneyId = outcome.airtelMoneyId || payment.airtelMoneyId;
    payment.gatewayResponseCode = outcome.responseCode || "";

    await payment.save();

    return this.toClient(payment);
  },

  async getPaymentForClient(paymentId, user = null) {
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      throw new ApiError(400, "Invalid Airtel payment id", "VALIDATION_ERROR");
    }
    const payment = await AirtelPayment.findById(paymentId).lean();
    if (!payment) throw new ApiError(404, "Airtel repayment request not found", "PAYMENT_NOT_FOUND");

    if (user?._id && String(payment.userId || "") && String(payment.userId) !== String(user._id)) {
      throw new ApiError(403, "You are not allowed to view this Airtel repayment", "FORBIDDEN");
    }

    return this.toClient(payment);
  },

  async refreshStatus(paymentId, user = null) {
    const config = getValidatedAirtelConfig();
    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      throw new ApiError(400, "Invalid Airtel payment id", "VALIDATION_ERROR");
    }
    const payment = await AirtelPayment.findById(paymentId);
    if (!payment) throw new ApiError(404, "Airtel repayment request not found", "PAYMENT_NOT_FOUND");

    if (user?._id && String(payment.userId || "") && String(payment.userId) !== String(user._id)) {
      throw new ApiError(403, "You are not allowed to view this Airtel repayment", "FORBIDDEN");
    }

    if (payment.status === "PAID") {
      await recordRepaymentOnAccount(payment);
      return this.toClient(payment);
    }

    const token = await getAccessToken(config);
    const statusResponse = await airtelRequest({
      method: "GET",
      path: `${config.statusPath.replace(/\/+$/, "")}/${encodeURIComponent(payment.transactionId)}`,
      config,
      token,
    });

    const outcome = parseAirtelOutcome(statusResponse);
    payment.statusResponse = sanitizePayload(statusResponse);
    payment.status = outcome.status;
    payment.gatewayResult = outcome.gatewayResult;
    payment.gatewayMessage = outcome.gatewayMessage;
    payment.airtelMoneyId = outcome.airtelMoneyId || payment.airtelMoneyId;
    payment.gatewayResponseCode = outcome.responseCode || payment.gatewayResponseCode;
    if (outcome.status === "PAID" && !payment.paidAt) payment.paidAt = new Date();
    if (["FAILED", "CANCELLED", "UNKNOWN"].includes(outcome.status) && !payment.failedAt) payment.failedAt = new Date();
    await payment.save();

    if (outcome.status === "PAID") await recordRepaymentOnAccount(payment);
    return this.toClient(payment);
  },

  async handleCallback(payload = {}) {
    const transactionId =
      payload?.transaction?.id ||
      payload?.data?.transaction?.id ||
      payload?.transactionId ||
      payload?.reference ||
      payload?.data?.transactionId ||
      "";

    if (!transactionId) {
      throw new ApiError(400, "Airtel callback did not include a transaction id", "AIRTEL_CALLBACK_INVALID");
    }

    const payment = await AirtelPayment.findOne({
      $or: [{ transactionId }, { reference: transactionId }, { airtelMoneyId: transactionId }],
    });

    if (!payment) {
      throw new ApiError(404, "Airtel repayment request not found for callback", "PAYMENT_NOT_FOUND");
    }

    const outcome = parseAirtelOutcome(payload);
    payment.callbackResponse = sanitizePayload(payload);
    payment.status = outcome.status;
    payment.gatewayResult = outcome.gatewayResult;
    payment.gatewayMessage = outcome.gatewayMessage;
    payment.airtelMoneyId = outcome.airtelMoneyId || payment.airtelMoneyId;
    payment.gatewayResponseCode = outcome.responseCode || payment.gatewayResponseCode;
    if (outcome.status === "PAID" && !payment.paidAt) payment.paidAt = new Date();
    if (["FAILED", "CANCELLED", "UNKNOWN"].includes(outcome.status) && !payment.failedAt) payment.failedAt = new Date();
    await payment.save();

    if (outcome.status === "PAID") await recordRepaymentOnAccount(payment);
    return this.toClient(payment);
  },

  toClient(paymentInput) {
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
      airtelPhone: maskPhone(payment.airtelPhone || ""),
      amount: payment.amount,
      currency: payment.currency,
      country: payment.country,
      description: payment.description,
      repaymentMonth: payment.repaymentMonth || null,
      repaymentType: payment.repaymentType || "custom",
      status: payment.status,
      gatewayResult: payment.gatewayResult || "",
      gatewayMessage: payment.gatewayMessage || "",
      gatewayResponseCode: payment.gatewayResponseCode || "",
      airtelMoneyId: payment.airtelMoneyId || "",
      reference: payment.reference || "",
      transactionId: payment.transactionId || "",
      createdAt: payment.createdAt,
      updatedAt: payment.updatedAt,
      paidAt: payment.paidAt,
      recordedAt: payment.recordedAt || null,
    };
  },
};
