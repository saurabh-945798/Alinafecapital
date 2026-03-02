import axios from "axios";
import { ADMIN_API_BASE_URL } from "../../config/api";
import { clearAdminSession, getAdminToken } from "../../utils/adminAuth";

export const api = axios.create({
  baseURL: ADMIN_API_BASE_URL,
  timeout: 20000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = getAdminToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status;
    const url = String(error?.config?.url || "");
    const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/refresh");

    if (status === 401 && !isAuthEndpoint && typeof window !== "undefined") {
      const current = window.location.pathname + window.location.search;
      clearAdminSession();
      if (!window.location.pathname.startsWith("/admin/login")) {
        const next = encodeURIComponent(current);
        window.location.replace(`/admin/login?next=${next}`);
      }
    }

    return Promise.reject(error);
  }
);

