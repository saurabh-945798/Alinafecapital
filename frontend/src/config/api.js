const trimBaseUrl = (value = "") => String(value || "").trim().replace(/\/+$/, "");

const defaultDevApiUrl = import.meta.env.DEV ? "/api/v1" : "";
const defaultDevFileBaseUrl = import.meta.env.DEV ? "http://localhost:5000" : "";

export const API_URL = trimBaseUrl(import.meta.env.VITE_API_URL || defaultDevApiUrl);

if (!API_URL) {
  throw new Error("Missing VITE_API_URL");
}

export const FILE_BASE_URL = trimBaseUrl(
  import.meta.env.VITE_FILE_BASE_URL || defaultDevFileBaseUrl
);

if (!FILE_BASE_URL) {
  throw new Error("Missing VITE_FILE_BASE_URL");
}
