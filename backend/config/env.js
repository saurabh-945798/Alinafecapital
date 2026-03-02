const requiredEnv = ["MONGO_URI", "PORT", "CORS_ORIGINS"];

export function validateEnv() {
  const missing = requiredEnv.filter((key) => !String(process.env[key] || "").trim());
  if (missing.length) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }
}

export function getCorsOrigins() {
  return String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
