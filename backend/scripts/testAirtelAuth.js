import dotenv from "dotenv";
import { airtelMoneyService } from "../services/airtelMoney.service.js";
import { getAirtelConfig, validateAirtelConfig } from "../config/airtel.js";

dotenv.config();

const mask = (value = "") => {
  const text = String(value || "");
  if (!text) return "missing";
  if (text.length <= 8) return `${text.slice(0, 2)}***`;
  return `${text.slice(0, 4)}***${text.slice(-4)}`;
};

async function main() {
  const config = getAirtelConfig();

  console.log("Airtel Money auth test configuration:");
  console.table({
    enabled: config.enabled,
    env: config.env,
    baseUrl: config.baseUrl,
    authPath: config.authPath,
    collectionPath: config.collectionPath,
    statusPath: config.statusPath,
    country: config.country,
    currency: config.currency,
    clientId: mask(config.clientId),
    clientSecret: mask(config.clientSecret),
    walletNumber: mask(config.walletNumber),
  });

  validateAirtelConfig(config);
  const result = await airtelMoneyService.testAuthentication();

  console.log("✅ Airtel Money OAuth authentication succeeded.");
  console.table(result);
}

main().catch((error) => {
  console.error("❌ Airtel Money OAuth authentication failed.");
  console.error(error.message || error);
  if (error.details) console.error("Details:", error.details);
  process.exit(1);
});
