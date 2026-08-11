/**
 * Payment data safety utilities.
 *
 * IMPORTANT: This project must never store or log cardholder data.
 * Card numbers, CVV/CVC, expiry values, track data, 3DS values and raw
 * sourceOfFunds/card payloads must stay with Mastercard Gateway only.
 */

const REDACTED = "[REDACTED]";

const SENSITIVE_KEY_PATTERNS = [
  /card\s*number/i,
  /^cardNumber$/i,
  /^number$/i,
  /^pan$/i,
  /primary\s*account\s*number/i,
  /account\s*number/i,
  /^cvv$/i,
  /^cvc$/i,
  /security\s*code/i,
  /^securityCode$/i,
  /card\s*security/i,
  /expiry/i,
  /^expMonth$/i,
  /^expYear$/i,
  /^expiryMonth$/i,
  /^expiryYear$/i,
  /name\s*on\s*card/i,
  /^cardholderName$/i,
  /^card$/i,
  /sourceOfFunds/i,
  /track\s*data/i,
  /authentication\s*value/i,
  /paRes/i,
  /cavv/i,
  /xid/i,
  /eci/i,
  /cryptogram/i,
  /token/i,
  /password/i,
  /secret/i,
];

const CARD_CONTAINER_KEYS = new Set([
  "card",
  "provided",
  "sourceoffunds",
  "source_of_funds",
  "paymentcard",
  "fundingcard",
]);

const SAFE_GATEWAY_ROOT_KEYS = new Set([
  "result",
  "gatewayresult",
  "response",
  "transaction",
  "order",
  "session",
  "timeofrecord",
  "version",
]);

const MAX_STRING_LENGTH = 500;
const MAX_DEPTH = 8;

export const isSensitivePaymentKey = (key = "") => {
  const normalized = String(key || "").trim();
  if (!normalized) return false;
  return SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(normalized));
};

const digitsOnly = (value = "") => String(value || "").replace(/\D/g, "");

const passesLuhn = (digits) => {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  let shouldDouble = false;
  for (let i = digits.length - 1; i >= 0; i -= 1) {
    let digit = Number(digits[i]);
    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    shouldDouble = !shouldDouble;
  }
  return sum % 10 === 0;
};

export const looksLikeCardNumber = (value) => {
  if (typeof value !== "string" && typeof value !== "number") return false;
  const digits = digitsOnly(value);
  return passesLuhn(digits);
};

const isPlainObject = (value) =>
  value && typeof value === "object" && !Array.isArray(value) && !(value instanceof Date) && !(value instanceof Error);

const redactCardNumbersInText = (text) =>
  String(text || "").replace(/(?:\d[ -]?){13,19}/g, (candidate) => {
    const digits = digitsOnly(candidate);
    return /^\d{13,19}$/.test(digits) ? REDACTED : candidate;
  });

const sanitizeString = (value) => {
  const text = redactCardNumbersInText(String(value));
  if (looksLikeCardNumber(text)) return REDACTED;
  if (text.length > MAX_STRING_LENGTH) return `${text.slice(0, MAX_STRING_LENGTH)}...`;
  return text;
};

/**
 * Recursively redacts sensitive values before they are written to logs/errors.
 */
export const sanitizeForLog = (input, depth = 0, parentKey = "") => {
  if (depth > MAX_DEPTH) return "[MAX_DEPTH]";
  if (input === null || input === undefined) return input;

  if (input instanceof Error) {
    return {
      name: input.name,
      message: sanitizeString(input.message || ""),
      code: input.code || input.errorCode || undefined,
      status: input.status || input.statusCode || undefined,
      details: sanitizeForLog(input.details, depth + 1),
      payload: sanitizeForLog(input.payload, depth + 1),
      stack: process.env.NODE_ENV === "production" ? undefined : input.stack,
    };
  }

  if (typeof input === "string" || typeof input === "number") return sanitizeString(input);
  if (typeof input === "boolean") return input;
  if (input instanceof Date) return input.toISOString();

  if (Array.isArray(input)) {
    return input.slice(0, 50).map((item) => sanitizeForLog(item, depth + 1, parentKey));
  }

  if (!isPlainObject(input)) return REDACTED;

  const normalizedParent = String(parentKey || "").toLowerCase();
  if (CARD_CONTAINER_KEYS.has(normalizedParent)) return REDACTED;

  return Object.entries(input).reduce((acc, [key, value]) => {
    if (isSensitivePaymentKey(key) || looksLikeCardNumber(value)) {
      acc[key] = REDACTED;
      return acc;
    }
    acc[key] = sanitizeForLog(value, depth + 1, key);
    return acc;
  }, {});
};

/**
 * Finds accidental card data in a request body before it reaches controllers.
 */
export const findProhibitedCardData = (input, path = "body", depth = 0, findings = []) => {
  if (depth > MAX_DEPTH || input === null || input === undefined) return findings;

  if (typeof input === "string" || typeof input === "number") {
    if (looksLikeCardNumber(input)) findings.push(`${path} looks like a card number`);
    return findings;
  }

  if (Array.isArray(input)) {
    input.forEach((item, index) => findProhibitedCardData(item, `${path}[${index}]`, depth + 1, findings));
    return findings;
  }

  if (!isPlainObject(input)) return findings;

  Object.entries(input).forEach(([key, value]) => {
    const nextPath = `${path}.${key}`;
    const lowerKey = String(key || "").toLowerCase();
    if (isSensitivePaymentKey(key) || CARD_CONTAINER_KEYS.has(lowerKey)) {
      findings.push(nextPath);
      return;
    }
    findProhibitedCardData(value, nextPath, depth + 1, findings);
  });

  return findings;
};

/**
 * Stores only non-sensitive gateway result/reference fields in MongoDB.
 * Raw card/sourceOfFunds sections are intentionally excluded.
 */
export const buildGatewayStorageSnapshot = (payload = {}) => {
  if (!payload || typeof payload !== "object") return null;

  const firstTransaction = Array.isArray(payload.transaction) ? payload.transaction[0] : null;
  const safeTransaction = firstTransaction
    ? {
        id: firstTransaction.transaction?.id || firstTransaction.id || "",
        type: firstTransaction.transaction?.type || firstTransaction.type || "",
        result: firstTransaction.result || "",
        receipt: firstTransaction.transaction?.receipt || firstTransaction.receipt || "",
        authorizationCode:
          firstTransaction.authorizationResponse?.transactionIdentifier ||
          firstTransaction.authorizationResponse?.posData ||
          "",
        response: {
          gatewayCode: firstTransaction.response?.gatewayCode || "",
          acquirerMessage: firstTransaction.response?.acquirerMessage || "",
          acquirerCode: firstTransaction.response?.acquirerCode || "",
        },
      }
    : null;

  const snapshot = {
    result: payload.result || payload.gatewayResult || "",
    response: payload.response
      ? {
          gatewayCode: payload.response.gatewayCode || "",
          acquirerMessage: payload.response.acquirerMessage || "",
          acquirerCode: payload.response.acquirerCode || "",
        }
      : undefined,
    order: payload.order
      ? {
          id: payload.order.id || "",
          amount: payload.order.amount || "",
          currency: payload.order.currency || "",
          status: payload.order.status || "",
          reference: payload.order.reference || "",
        }
      : undefined,
    session: payload.session ? { id: payload.session.id || "" } : undefined,
    transaction: safeTransaction ? [safeTransaction] : undefined,
    error: payload.error
      ? {
          cause: payload.error.cause || "",
          explanation: payload.error.explanation || "",
          field: payload.error.field || "",
          validationType: payload.error.validationType || "",
        }
      : undefined,
    timeOfRecord: payload.timeOfRecord || "",
    version: payload.version || "",
  };

  return sanitizeForLog(
    Object.fromEntries(Object.entries(snapshot).filter(([, value]) => value !== undefined && value !== null))
  );
};

export const REDACTED_PAYMENT_VALUE = REDACTED;
