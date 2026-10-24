import { ADMIN_API_BASE_URL } from "../../config/api";
import { clearAdminSession, getAdminToken, setAdminToken } from "../../utils/adminAuth";

let refreshPromise = null;

const buildUrl = (path, params) => {
  const raw = `${ADMIN_API_BASE_URL}${String(path || "").startsWith("/") ? path : `/${path}`}`;
  if (!params || typeof params !== "object") return raw;
  const base = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url = new URL(raw, base);
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    if (Array.isArray(value)) value.forEach((item) => url.searchParams.append(key, item));
    else url.searchParams.set(key, value);
  });
  return raw.startsWith("http") ? url.toString() : `${url.pathname}${url.search}`;
};

const parseBody = async (response, responseType = "") => {
  if (response.status === 204) return null;
  if (responseType === "blob") return response.blob();
  const type = response.headers.get("content-type") || "";
  if (type.includes("application/json")) return response.json();
  const text = await response.text();
  return text || null;
};

const makeError = (message, { response, data, config, code } = {}) => {
  const error = new Error(message || "Request failed");
  if (response) error.response = { status: response.status, data, headers: response.headers };
  if (config) error.config = config;
  if (code) error.code = code;
  return error;
};

const rawRequest = async (config) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), Number(config.timeout || 45000));
  const headers = new Headers(config.headers || {});
  const token = getAdminToken();
  if (token && !config.skipAuth) headers.set("Authorization", `Bearer ${token}`);

  let body;
  if (config.data !== undefined && config.data !== null) {
    if (config.data instanceof FormData || config.data instanceof Blob || typeof config.data === "string") body = config.data;
    else {
      headers.set("Content-Type", "application/json");
      body = JSON.stringify(config.data);
    }
  }

  try {
    const response = await fetch(buildUrl(config.url, config.params), {
      method: config.method || "GET",
      headers,
      body,
      credentials: "include",
      signal: controller.signal,
    });
    const data = await parseBody(response, config.responseType);
    if (!response.ok) {
      throw makeError(data?.message || `Request failed with status ${response.status}`, { response, data, config });
    }
    return { data, status: response.status, headers: response.headers, config };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw makeError("Request timed out. Backend took too long to respond. Please check server/API URL and try again.", {
        config,
        code: "ECONNABORTED",
      });
    }
    if (!error?.response && error instanceof TypeError) {
      throw makeError("Network Error: the admin app could not reach the backend API. Confirm the backend is running and the API URL is correct.", {
        config,
        code: "ERR_NETWORK",
      });
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
};

export const refreshAdminSession = async () => {
  if (!refreshPromise) {
    refreshPromise = rawRequest({ method: "POST", url: "/auth/refresh", skipAuth: true, skipRefresh: true })
      .then((response) => {
        const token = response?.data?.accessToken || response?.data?.token || "";
        if (!token) throw new Error("Missing refreshed access token");
        setAdminToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};

const request = async (config) => {
  try {
    return await rawRequest(config);
  } catch (error) {
    const status = error?.response?.status;
    const code = String(error?.response?.data?.code || "");
    const url = String(config?.url || "");
    const isAuthEndpoint = url.includes("/auth/login") || url.includes("/auth/admin/login") || url.includes("/auth/refresh") || url.includes("/auth/logout");

    if (status === 401 && !config?._retry && !config?.skipRefresh && !isAuthEndpoint) {
      try {
        await refreshAdminSession();
        return rawRequest({ ...config, _retry: true });
      } catch (refreshError) {
        clearAdminSession();
        if (typeof window !== "undefined" && !window.location.pathname.startsWith("/admin/login")) {
          const current = window.location.pathname + window.location.search;
          window.location.replace(`/admin/login?next=${encodeURIComponent(current)}`);
        }
        throw refreshError;
      }
    }

    if (status === 403 && code === "ROLE_FORBIDDEN" && typeof window !== "undefined") {
      if (window.location.pathname.startsWith("/admin/user-access")) window.location.replace("/admin/applications");
    }
    throw error;
  }
};

export const api = {
  request,
  get: (url, config = {}) => request({ ...config, method: "GET", url }),
  post: (url, data, config = {}) => request({ ...config, method: "POST", url, data }),
  put: (url, data, config = {}) => request({ ...config, method: "PUT", url, data }),
  patch: (url, data, config = {}) => request({ ...config, method: "PATCH", url, data }),
  delete: (url, config = {}) => request({ ...config, method: "DELETE", url }),
};
