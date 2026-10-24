import { API_URL } from "../config/api";

let accessToken = "";
let refreshPromise = null;

export const getAccessToken = () => accessToken;
export const setAccessToken = (token = "") => {
  accessToken = String(token || "").trim();
};
export const clearAccessToken = () => {
  accessToken = "";
};

const buildUrl = (path, params) => {
  const raw = `${API_URL}${String(path || "").startsWith("/") ? path : `/${path}`}`;
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

const extractAccessToken = (payload) => {
  const data = payload?.data ?? payload ?? {};
  return data?.accessToken || data?.token || data?.data?.accessToken || data?.data?.token || "";
};

const parseBody = async (response) => {
  if (response.status === 204) return null;
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
  const timeoutMs = Number(config.timeout || 45000);
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  const headers = new Headers(config.headers || {});
  const token = getAccessToken();
  if (token && !config.skipAuth) headers.set("Authorization", `Bearer ${token}`);

  let body;
  if (config.data !== undefined && config.data !== null) {
    if (config.data instanceof FormData || config.data instanceof Blob || typeof config.data === "string") {
      body = config.data;
    } else {
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
    const data = await parseBody(response);
    if (!response.ok) {
      throw makeError(data?.message || `Request failed with status ${response.status}`, {
        response,
        data,
        config,
      });
    }
    return { data, status: response.status, headers: response.headers, config };
  } catch (error) {
    if (error?.name === "AbortError") {
      throw makeError(
        "Request timed out. The backend took too long to respond. Confirm MongoDB and the backend server are running.",
        { config, code: "ECONNABORTED" }
      );
    }
    if (!error?.response && error instanceof TypeError) {
      throw makeError(
        "Network Error: the customer app could not reach the backend API. Confirm the backend is running and the API URL is correct.",
        { config, code: "ERR_NETWORK" }
      );
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
};

const request = async (config) => {
  try {
    return await rawRequest(config);
  } catch (error) {
    const status = error?.response?.status;
    const requestUrl = String(config?.url || "");
    const isAuthRequest = ["/auth/login", "/auth/register", "/auth/refresh", "/auth/logout", "/auth/forgot-password", "/auth/reset-password"].some((p) =>
      requestUrl.includes(p)
    );

    if (status !== 401 || config?._retry || config?.skipRefresh || isAuthRequest) throw error;

    try {
      if (!refreshPromise) {
        refreshPromise = rawRequest({ method: "POST", url: "/auth/refresh", skipAuth: true, skipRefresh: true })
          .then((response) => {
            const token = extractAccessToken(response?.data);
            if (!token) throw new Error("Missing refreshed access token");
            setAccessToken(token);
            return token;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }
      await refreshPromise;
      return rawRequest({ ...config, _retry: true });
    } catch (refreshError) {
      clearAccessToken();
      if (typeof window !== "undefined") window.dispatchEvent(new Event("alinafe:session-expired"));
      throw refreshError;
    }
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

export const refreshBrowserSession = async () => {
  if (!refreshPromise) {
    refreshPromise = rawRequest({ method: "POST", url: "/auth/refresh", skipAuth: true, skipRefresh: true })
      .then((response) => {
        const token = extractAccessToken(response?.data);
        if (!token) throw new Error("Missing refreshed access token");
        setAccessToken(token);
        return token;
      })
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
};
