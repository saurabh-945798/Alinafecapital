export const ADMIN_API_BASE_URL = (import.meta.env.VITE_ADMIN_API_BASE_URL || "").trim();

if (!ADMIN_API_BASE_URL) {
  throw new Error("Missing VITE_ADMIN_API_BASE_URL");
}

export const ADMIN_FILE_BASE_URL = (import.meta.env.VITE_ADMIN_FILE_BASE_URL || "").trim();

if (!ADMIN_FILE_BASE_URL) {
  throw new Error("Missing VITE_ADMIN_FILE_BASE_URL");
}
