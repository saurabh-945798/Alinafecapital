const trimBaseUrl = (value = "") => String(value || "").trim().replace(/\/+$/, "");

const defaultDevApiUrl = import.meta.env.DEV ? "/api/v1" : "";
const defaultDevFileBaseUrl = import.meta.env.DEV ? "http://localhost:5000" : "";

export const ADMIN_API_BASE_URL = trimBaseUrl(
  import.meta.env.VITE_ADMIN_API_BASE_URL || defaultDevApiUrl
);

if (!ADMIN_API_BASE_URL) {
  throw new Error("Missing VITE_ADMIN_API_BASE_URL");
}

export const ADMIN_FILE_BASE_URL = trimBaseUrl(
  import.meta.env.VITE_ADMIN_FILE_BASE_URL || defaultDevFileBaseUrl
);

if (!ADMIN_FILE_BASE_URL) {
  throw new Error("Missing VITE_ADMIN_FILE_BASE_URL");
}

const derivePublicAppUrl = () => {
  if (typeof window === "undefined") return "";

  const { protocol, hostname } = window.location;
  if (!hostname) return "";

  if (hostname === "admin.alinafecapital.com") {
    return "https://alinafecapital.com";
  }

  const stripped = hostname.replace(/^admin\./i, "");
  if (stripped && stripped !== hostname) {
    return `${protocol}//${stripped}`;
  }

  if (import.meta.env.DEV) return "http://localhost:5173";

  return "";
};

export const PUBLIC_APP_URL = trimBaseUrl(
  import.meta.env.VITE_PUBLIC_APP_URL || derivePublicAppUrl()
);

if (!PUBLIC_APP_URL) {
  throw new Error("Missing VITE_PUBLIC_APP_URL");
}
