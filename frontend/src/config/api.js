export const API_URL = (import.meta.env.VITE_API_URL || "").trim();

if (!API_URL) {
  throw new Error("Missing VITE_API_URL");
}

export const FILE_BASE_URL = (import.meta.env.VITE_FILE_BASE_URL || "").trim();

if (!FILE_BASE_URL) {
  throw new Error("Missing VITE_FILE_BASE_URL");
}
