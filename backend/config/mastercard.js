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
    clean.includes("live_gateway_host") ||
    clean.includes("merchant_id") ||
    clean.includes("api_password") ||
    clean.includes("api password")
  );
};

const hasDocumentationPath = (gatewayHost = "") => {
  const clean = String(gatewayHost || "").toLowerCase();
  return clean.includes("/api/documentation") || clean.includes("integrationguidelines") || clean.includes("apidocumentation");
};

export function getMastercardConfig() {
  const gatewayHost = trimTrailingSlash(process.env.MPGS_GATEWAY_HOST || "");
  const apiVersion = String(process.env.MPGS_API_VERSION || "").trim();
  const merchantId = String(process.env.MPGS_MERCHANT_ID || "").trim();
  const apiPassword = String(process.env.MPGS_API_PASSWORD || "").trim();
  const appBaseUrl = trimTrailingSlash(
    process.env.APP_BASE_URL || process.env.FRONTEND_BASE_URL || process.env.PUBLIC_SITE_URL || ""
  );

  const currency = String(process.env.MPGS_REPAYMENT_CURRENCY || process.env.MPGS_APPLICATION_FEE_CURRENCY || "MWK")
    .trim()
    .toUpperCase();
  const transactionDescription = String(
    process.env.MPGS_TRANSACTION_DESCRIPTION || "Alinafe Capital loan repayment"
  ).trim();
  const orderPrefix = String(process.env.MPGS_ORDER_ID_PREFIX || "ACLR").trim().toUpperCase();
  const enabled = boolFromEnv(process.env.MPGS_ENABLED, true);
  const minRepaymentAmount = toNumber(process.env.MPGS_MIN_REPAYMENT_AMOUNT, 1);
  const maxRepaymentAmount = toNumber(process.env.MPGS_MAX_REPAYMENT_AMOUNT, 0);

  return {
    enabled,
    gatewayHost,
    apiVersion,
    merchantId,
    apiPassword,
    appBaseUrl,
    currency,
    transactionDescription,
    orderPrefix,
    minRepaymentAmount,
    maxRepaymentAmount,
    checkoutScriptUrl: String(process.env.MPGS_CHECKOUT_SCRIPT_URL || "").trim(),
  };
}

export function validateMastercardConfig(config = getMastercardConfig()) {
  const missing = [];
  const invalid = [];

  if (!config.gatewayHost) missing.push("MPGS_GATEWAY_HOST");
  if (!config.apiVersion) missing.push("MPGS_API_VERSION");
  if (!config.merchantId) missing.push("MPGS_MERCHANT_ID");
  if (!config.apiPassword) missing.push("MPGS_API_PASSWORD");
  if (!config.appBaseUrl) missing.push("APP_BASE_URL or FRONTEND_BASE_URL");

  if (config.gatewayHost && isPlaceholderValue(config.gatewayHost)) {
    invalid.push("MPGS_GATEWAY_HOST still contains a placeholder value");
  }
  if (config.gatewayHost && hasDocumentationPath(config.gatewayHost)) {
    invalid.push("MPGS_GATEWAY_HOST must be the gateway base URL only, not a Mastercard documentation/API path");
  }
  if (config.gatewayHost && !/^https?:\/\//i.test(config.gatewayHost)) {
    invalid.push("MPGS_GATEWAY_HOST must start with https://");
  }
  if (config.apiVersion && !/^\d+$/.test(config.apiVersion)) {
    invalid.push("MPGS_API_VERSION must be a number, for example 100");
  }
  if (config.merchantId && isPlaceholderValue(config.merchantId)) {
    invalid.push("MPGS_MERCHANT_ID still contains a placeholder value");
  }
  if (config.apiPassword && isPlaceholderValue(config.apiPassword)) {
    invalid.push("MPGS_API_PASSWORD still contains a placeholder value");
  }
  if (config.appBaseUrl && isPlaceholderValue(config.appBaseUrl)) {
    invalid.push("APP_BASE_URL still contains a placeholder value");
  }
  if (config.maxRepaymentAmount > 0 && config.maxRepaymentAmount < config.minRepaymentAmount) {
    invalid.push("MPGS_MAX_REPAYMENT_AMOUNT cannot be less than MPGS_MIN_REPAYMENT_AMOUNT");
  }

  if (missing.length || invalid.length) {
    const parts = [];
    if (missing.length) parts.push(`Missing: ${missing.join(", ")}`);
    if (invalid.length) parts.push(`Invalid: ${invalid.join("; ")}`);

    const error = new Error(`Mastercard repayment is not ready. ${parts.join(". ")}`);
    error.code = "MPGS_CONFIG_INCOMPLETE";
    error.missing = missing;
    error.invalid = invalid;
    throw error;
  }

  return true;
}

export function getMastercardSessionScriptUrl(config = getMastercardConfig()) {
  if (config.checkoutScriptUrl) return config.checkoutScriptUrl;
  return `${config.gatewayHost}/form/version/${encodeURIComponent(config.apiVersion)}/merchant/${encodeURIComponent(
    config.merchantId
  )}/session.js`;
}

export function buildMastercardRestUrl(path, config = getMastercardConfig()) {
  return `${config.gatewayHost}/api/rest/version/${encodeURIComponent(config.apiVersion)}/merchant/${encodeURIComponent(
    config.merchantId
  )}${path}`;
}
