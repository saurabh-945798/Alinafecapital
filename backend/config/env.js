const requiredEnv = ["MONGO_URI", "PORT", "CORS_ORIGINS"];

const defaultCorsOrigins = [
  "https://alinafecapital.com",
  "https://www.alinafecapital.com",
  "https://admin.alinafecapital.com",
];

export function normalizeCorsOrigin(origin = "") {
  return String(origin || "").trim().replace(/\/+$/, "");
}

export function validateEnv() {
  const missing = requiredEnv.filter((key) => !String(process.env[key] || "").trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export function getCorsOrigins() {
  const configuredOrigins = String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map(normalizeCorsOrigin)
    .filter(Boolean);

  return Array.from(new Set([...configuredOrigins, ...defaultCorsOrigins.map(normalizeCorsOrigin)]));
}
