export const ADMIN_API_BASE_URL = (import.meta.env.VITE_ADMIN_API_BASE_URL || "").trim();

if (!ADMIN_API_BASE_URL) {
  throw new Error("Missing VITE_ADMIN_API_BASE_URL");
}

export const ADMIN_FILE_BASE_URL = (import.meta.env.VITE_ADMIN_FILE_BASE_URL || "").trim();

if (!ADMIN_FILE_BASE_URL) {
  throw new Error("Missing VITE_ADMIN_FILE_BASE_URL");
}

export const PUBLIC_APP_URL = (import.meta.env.VITE_PUBLIC_APP_URL || "").trim();

if (!PUBLIC_APP_URL) {
  throw new Error("Missing VITE_PUBLIC_APP_URL");
}
