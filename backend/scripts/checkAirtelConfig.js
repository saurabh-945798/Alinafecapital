import "dotenv/config";
import { buildAirtelUrl, getAirtelConfig, validateAirtelConfig } from "../config/airtel.js";

const mask = (value = "") => {
  const text = String(value || "");
  if (!text) return "";
  if (text.length <= 6) return "***";
  return `${text.slice(0, 4)}***${text.slice(-3)}`;
};

try {
  const config = getAirtelConfig();
  validateAirtelConfig(config);

  console.log("✅ Airtel Money repayment configuration looks complete.\n");
  console.table({
    enabled: config.enabled,
    env: config.env,
    baseUrl: config.baseUrl,
    clientId: mask(config.clientId),
    clientSecretLoaded: Boolean(config.clientSecret),
    apiKeyLoaded: Boolean(config.apiKey),
    country: config.country,
    currency: config.currency,
    walletNumber: mask(config.walletNumber),
    collectionPath: config.collectionPath,
    statusPath: config.statusPath,
    transactionPrefix: config.transactionPrefix,
    minRepaymentAmount: config.minRepaymentAmount,
    maxRepaymentAmount: config.maxRepaymentAmount,
  });

  console.log("\nEndpoint preview:");
  console.log("Token:", buildAirtelUrl(config.authPath, config));
  console.log("Collection:", buildAirtelUrl(config.collectionPath, config));
  console.log("Status:", `${buildAirtelUrl(config.statusPath, config)}/{transactionId}`);
  console.log("\nNext step: start backend with `npm run dev`, then test Customer Dashboard → Repayments → Airtel Money.");
} catch (error) {
  console.error("❌ Airtel Money repayment configuration is incomplete.\n");
  console.error(error.message);
  if (error.missing?.length) console.error("Missing:", error.missing.join(", "));
  if (error.invalid?.length) console.error("Invalid:", error.invalid.join("; "));

  console.error("\nExact file to fix:");
  console.error("AlinafeCapital/backend/.env");

  console.error("\nAdd this block to backend/.env and replace the placeholders:");
  console.error(`
AIRTEL_ENABLED=true
AIRTEL_ENV=uat
AIRTEL_BASE_URL=https://openapiuat.airtel.africa
AIRTEL_CLIENT_ID=PASTE_AIRTEL_CLIENT_ID
AIRTEL_CLIENT_SECRET=PASTE_AIRTEL_CLIENT_SECRET_OR_API_KEY
AIRTEL_API_KEY=
AIRTEL_WALLET_NUMBER=PASTE_AIRTEL_WALLET_NUMBER
AIRTEL_COUNTRY=MW
AIRTEL_CURRENCY=MWK
AIRTEL_AUTH_PATH=/auth/oauth2/token
AIRTEL_COLLECTION_PATH=/merchant/v1/payments/
AIRTEL_STATUS_PATH=/standard/v1/payments
AIRTEL_TRANSACTION_PREFIX=ACLA
AIRTEL_MIN_REPAYMENT_AMOUNT=1
AIRTEL_MAX_REPAYMENT_AMOUNT=0
AIRTEL_REQUEST_TIMEOUT_MS=30000
`);

  console.error("Note: If Airtel only gave you one value called an API key, place that value in AIRTEL_CLIENT_SECRET first. Only use AIRTEL_API_KEY if Airtel gave you a separate additional key.");
  process.exit(1);
}
