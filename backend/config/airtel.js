const trimTrailingSlash = (value = "") => String(value || "").trim().replace(/\/+$/, "");

const toNumber = (value, fallback = 0) => {
  const normalized = String(value ?? "").replace(/,/g, "").trim();
  const num = Number(normalized);
  return Number.isFinite(num) ? num : fallback;
};

const boolFromEnv = (value, fallback = false) => {
  if (value === undefined || value === null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
};

const isPlaceholderValue = (value = "") => {
  const clean = String(value || "").trim().toLowerCase();
  if (!clean) return false;
  return (
    clean.includes("your_") ||
    clean.includes("replace_me") ||
    clean.includes("replace-with") ||
    clean.includes("replace_with") ||
    clean.includes("placeholder") ||
    clean.includes("<") ||
    clean.includes(">") ||
    clean.includes("client_id") ||
    clean.includes("client_secret") ||
    clean.includes("api_key") ||
    clean.includes("wallet_number")
  );
};

const normalizePath = (value = "", fallback = "/") => {
  const clean = String(value || fallback).trim();
  if (!clean) return fallback;
  return clean.startsWith("/") ? clean : `/${clean}`;
};

const getDefaultBaseUrl = () => {
  const env = String(process.env.AIRTEL_ENV || process.env.NODE_ENV || "uat").trim().toLowerCase();
  return ["live", "production", "prod"].includes(env)
    ? "https://openapi.airtel.africa"
    : "https://openapiuat.airtel.africa";
};

export function getAirtelConfig() {
  const baseUrl = trimTrailingSlash(process.env.AIRTEL_BASE_URL || getDefaultBaseUrl());
  const enabled = boolFromEnv(process.env.AIRTEL_ENABLED, false);
  const clientId = String(process.env.AIRTEL_CLIENT_ID || "").trim();
  const clientSecret = String(process.env.AIRTEL_CLIENT_SECRET || process.env.AIRTEL_API_KEY || "").trim();
  const apiKey = String(process.env.AIRTEL_API_KEY || "").trim();
  const apiKeyHeaderName = String(process.env.AIRTEL_API_KEY_HEADER_NAME || "X-API-Key").trim();
  const walletNumber = String(process.env.AIRTEL_WALLET_NUMBER || "").trim();
  const country = String(process.env.AIRTEL_COUNTRY || "MW").trim().toUpperCase();
  const currency = String(process.env.AIRTEL_CURRENCY || "MWK").trim().toUpperCase();

  return {
    enabled,
    env: String(process.env.AIRTEL_ENV || "uat").trim().toLowerCase(),
    baseUrl,
    clientId,
    clientSecret,
    apiKey,
    apiKeyHeaderName,
    walletNumber,
    country,
    currency,
    authPath: normalizePath(process.env.AIRTEL_AUTH_PATH || "/auth/oauth2/token"),
    collectionPath: normalizePath(process.env.AIRTEL_COLLECTION_PATH || "/merchant/v1/payments/"),
    statusPath: normalizePath(process.env.AIRTEL_STATUS_PATH || "/standard/v1/payments"),
    requestTimeoutMs: toNumber(process.env.AIRTEL_REQUEST_TIMEOUT_MS, 30000),
    transactionPrefix: String(process.env.AIRTEL_TRANSACTION_PREFIX || "ACLA").trim().toUpperCase(),
    msisdnFormat: String(process.env.AIRTEL_MSISDN_FORMAT || "national").trim().toLowerCase(),
    minRepaymentAmount: toNumber(process.env.AIRTEL_MIN_REPAYMENT_AMOUNT, 1),
    maxRepaymentAmount: toNumber(process.env.AIRTEL_MAX_REPAYMENT_AMOUNT, 0),
  };
}

export function buildAirtelUrl(path, config = getAirtelConfig()) {
  const cleanPath = normalizePath(path);
  return `${config.baseUrl}${cleanPath}`;
}

export function validateAirtelConfig(config = getAirtelConfig()) {
  const missing = [];
  const invalid = [];

  if (!config.baseUrl) missing.push("AIRTEL_BASE_URL");
  if (!config.clientId) missing.push("AIRTEL_CLIENT_ID");
  if (!config.clientSecret) missing.push("AIRTEL_CLIENT_SECRET or AIRTEL_API_KEY");
  if (!config.country) missing.push("AIRTEL_COUNTRY");
  if (!config.currency) missing.push("AIRTEL_CURRENCY");

  if (config.baseUrl && isPlaceholderValue(config.baseUrl)) invalid.push("AIRTEL_BASE_URL still contains a placeholder value");
  if (config.clientId && isPlaceholderValue(config.clientId)) invalid.push("AIRTEL_CLIENT_ID still contains a placeholder value");
  if (config.clientSecret && isPlaceholderValue(config.clientSecret)) invalid.push("AIRTEL_CLIENT_SECRET/AIRTEL_API_KEY still contains a placeholder value");
  if (config.baseUrl && !/^https?:\/\//i.test(config.baseUrl)) invalid.push("AIRTEL_BASE_URL must start with https://");
  if (config.country && !/^[A-Z]{2}$/.test(config.country)) invalid.push("AIRTEL_COUNTRY must be a two-letter country code, for Malawi use MW");
  if (config.currency && !/^[A-Z]{3}$/.test(config.currency)) invalid.push("AIRTEL_CURRENCY must be a three-letter currency code, for Malawi use MWK");
  if (config.msisdnFormat && !["national", "local", "e164"].includes(config.msisdnFormat)) {
    invalid.push("AIRTEL_MSISDN_FORMAT must be one of: national, local, e164");
  }
  if (config.maxRepaymentAmount > 0 && config.maxRepaymentAmount < config.minRepaymentAmount) {
    invalid.push("AIRTEL_MAX_REPAYMENT_AMOUNT cannot be less than AIRTEL_MIN_REPAYMENT_AMOUNT");
  }

  if (missing.length || invalid.length) {
    const parts = [];
    if (missing.length) parts.push(`Missing: ${missing.join(", ")}`);
    if (invalid.length) parts.push(`Invalid: ${invalid.join("; ")}`);
    const error = new Error(`Airtel Money repayment is not ready. ${parts.join(". ")}`);
    error.code = "AIRTEL_CONFIG_INCOMPLETE";
    error.missing = missing;
    error.invalid = invalid;
    throw error;
  }

  return true;
}
