import "dotenv/config";
import {
  buildMastercardRestUrl,
  getMastercardConfig,
  getMastercardSessionScriptUrl,
  validateMastercardConfig,
} from "../config/mastercard.js";

const mask = (value = "", visibleStart = 4, visibleEnd = 3) => {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= visibleStart + visibleEnd) return "***";
  return `${text.slice(0, visibleStart)}***${text.slice(-visibleEnd)}`;
};

const sanitizeUrl = (url = "") =>
  String(url || "").replace(/(merchant\/)[^/]+/i, "$1<MERCHANT_ID>");

try {
  const config = getMastercardConfig();
  validateMastercardConfig(config);

  console.log("✅ Mastercard Hosted Session repayment configuration looks complete.\n");
  console.log("Resolved configuration:");
  console.table({
    enabled: config.enabled,
    gatewayHost: config.gatewayHost,
    apiVersion: config.apiVersion,
    merchantId: mask(config.merchantId),
    appBaseUrl: config.appBaseUrl,
    currency: config.currency,
    orderPrefix: config.orderPrefix,
    minRepaymentAmount: config.minRepaymentAmount,
    maxRepaymentAmount: config.maxRepaymentAmount,
  });

  console.log("\nEndpoint preview:");
  console.log("Create session:", sanitizeUrl(buildMastercardRestUrl("/session", config)));
  console.log(
    "PAY transaction:",
    sanitizeUrl(buildMastercardRestUrl("/order/{orderId}/transaction/{transactionId}", config))
  );
  console.log("Retrieve order:", sanitizeUrl(buildMastercardRestUrl("/order/{orderId}", config)));
  console.log("session.js:", sanitizeUrl(getMastercardSessionScriptUrl(config)));
  console.log("\nNext step: start the backend with `npm run dev`, then test Customer Dashboard → Repayments → Pay by Card.");
  process.exit(0);
} catch (error) {
  console.error("❌ Mastercard Hosted Session repayment configuration is incomplete.\n");
  console.error(error?.message || error);
  if (error?.missing?.length) console.error("Missing:", error.missing.join(", "));
  if (error?.invalid?.length) console.error("Invalid:", error.invalid.join("; "));

  console.error("\nAdd this block to AlinafeCapital/backend/.env and replace the placeholders:\n");
  console.error(`MPGS_ENABLED=true
MPGS_GATEWAY_HOST=https://REPLACE_WITH_LIVE_GATEWAY_BASE_HOST
MPGS_API_VERSION=100
MPGS_MERCHANT_ID=ALINAFELTD01
MPGS_API_PASSWORD=f0f24bb65ec5f267d48783a202cb6ce1
APP_BASE_URL=http://localhost:5173
FRONTEND_BASE_URL=http://localhost:5173
MPGS_REPAYMENT_CURRENCY=MWK
MPGS_ORDER_ID_PREFIX=ACLR
MPGS_TRANSACTION_DESCRIPTION=Alinafe Capital loan repayment
MPGS_MIN_REPAYMENT_AMOUNT=1
MPGS_MAX_REPAYMENT_AMOUNT=0
MPGS_CHECKOUT_SCRIPT_URL=
MPGS_REQUEST_TIMEOUT_MS=30000`);

  console.error("\nImportant: MPGS_GATEWAY_HOST must be the base host only, not a Mastercard documentation URL.");
  console.error("Template file: backend/.env.mpgs-hosted-session.template");
  console.error("Guide file: backend/docs/MPGS_HOSTED_SESSION_REPAYMENT_SETUP.md");
  process.exit(1);
}
