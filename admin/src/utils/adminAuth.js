const TOKEN_KEY = "adminToken";
const USER_KEY = "adminUser";

export const getAdminToken = () => {
  if (typeof window === "undefined") return "";
  return (window.localStorage.getItem(TOKEN_KEY) || "").trim();
};

export const setAdminToken = (token) => {
  if (typeof window === "undefined") return;
  const value = String(token || "").trim();
  if (!value) {
    window.localStorage.removeItem(TOKEN_KEY);
    return;
  }
  window.localStorage.setItem(TOKEN_KEY, value);
};

export const clearAdminToken = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
};

export const getAdminUser = () => {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const setAdminUser = (user) => {
  if (typeof window === "undefined") return;
  if (!user) {
    window.localStorage.removeItem(USER_KEY);
    return;
  }
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
};

export const clearAdminUser = () => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(USER_KEY);
};

export const clearAdminSession = () => {
  clearAdminToken();
  clearAdminUser();
};

export const isAdminLoggedIn = () => Boolean(getAdminToken());

