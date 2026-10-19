const USER_KEY = "adminUser";
let adminToken = "";

export const getAdminToken = () => adminToken;

export const setAdminToken = (token) => {
  adminToken = String(token || "").trim();
};

export const clearAdminToken = () => {
  adminToken = "";
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
