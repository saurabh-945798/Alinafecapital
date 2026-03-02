export const getEnvAdminKey = () => (import.meta.env.VITE_ADMIN_KEY || "").trim();

export const getLocalAdminKey = () => {
  if (typeof window === "undefined") return "";
  return (window.localStorage.getItem("admin_api_key") || "").trim();
};

export const getActiveAdminKey = () => {
  const envKey = getEnvAdminKey();
  const localKey = getLocalAdminKey();
  return envKey || localKey;
};

export const setLocalAdminKey = (key) => {
  if (typeof window === "undefined") return;
  const trimmed = String(key || "").trim();
  if (!trimmed) {
    window.localStorage.removeItem("admin_api_key");
    return;
  }
  window.localStorage.setItem("admin_api_key", trimmed);
};

export const clearLocalAdminKey = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("admin_api_key");
};
