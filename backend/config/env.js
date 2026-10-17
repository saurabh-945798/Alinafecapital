const requiredEnv = ["MONGO_URI", "PORT", "CORS_ORIGINS"];

const defaultCorsOrigins = [
  "https://alinafecapital.com",
  "https://www.alinafecapital.com",
  "https://admin.alinafecapital.com",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
  "http://127.0.0.1:5174",
];

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

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

function isPrivateNetworkHostname(hostname = "") {
  const host = String(hostname || "").toLowerCase();
  return (
    LOCAL_HOSTNAMES.has(host) ||
    host.startsWith("192.168.") ||
    host.startsWith("10.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host)
  );
}

export function isDevelopmentOrigin(origin = "") {
  if (process.env.NODE_ENV === "production") return false;

  try {
    const parsed = new URL(origin);
    const allowedProtocol = parsed.protocol === "http:" || parsed.protocol === "https:";
    return allowedProtocol && isPrivateNetworkHostname(parsed.hostname);
  } catch {
    return false;
  }
}

export function isCorsOriginAllowed(origin = "") {
  if (!origin) return true;

  const normalizedOrigin = normalizeCorsOrigin(origin);
  const allowedOrigins = getCorsOrigins();
  const hasWildcard = allowedOrigins.includes("*");

  if (hasWildcard) return true;
  if (allowedOrigins.includes(normalizedOrigin)) return true;

  // Local development fix: Vite may serve the customer/admin app from localhost,
  // 127.0.0.1, or a LAN address during testing. Without this, the browser blocks
  // login calls and Axios only shows a vague "Network Error".
  if (isDevelopmentOrigin(normalizedOrigin)) return true;

  return false;
}
