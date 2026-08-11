import axios from "axios";
import { API_URL } from "../config/api";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 45000,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem("token");
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

let refreshPromise = null;

const extractAccessToken = (payload) => {
  const data = payload?.data ?? payload ?? {};
  return data?.accessToken || data?.token || data?.data?.accessToken || data?.data?.token || "";
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error?.config;
    const status = error?.response?.status;

    if (!error?.response && (error?.code === "ERR_NETWORK" || error?.message === "Network Error")) {
      error.message =
        "Network Error: the customer app could not reach the backend API. Confirm the backend is running on port 5000, then restart the frontend. For local testing, VITE_API_URL should be /api/v1 and VITE_DEV_PROXY_TARGET should be http://localhost:5000.";
    }

    if (error?.code === "ECONNABORTED") {
      error.message =
        "Request timed out. The backend took too long to respond. Confirm MongoDB and the backend server are running.";
    }

    if (!originalRequest || status !== 401 || originalRequest._retry) {
      return Promise.reject(error);
    }

    const requestUrl = String(originalRequest.url || "");
    const isAuthRequest =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/logout");

    if (isAuthRequest) {
      return Promise.reject(error);
    }

    try {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = api
          .post("/auth/refresh")
          .then((response) => {
            const nextToken = extractAccessToken(response?.data);
            if (!nextToken) {
              throw new Error("Missing refreshed access token");
            }

            if (typeof window !== "undefined") {
              window.localStorage.setItem("token", nextToken);
            }

            return nextToken;
          })
          .finally(() => {
            refreshPromise = null;
          });
      }

      const nextToken = await refreshPromise;
      originalRequest.headers = originalRequest.headers || {};
      originalRequest.headers.Authorization = `Bearer ${nextToken}`;
      return api(originalRequest);
    } catch (refreshError) {
      if (typeof window !== "undefined") {
        window.localStorage.removeItem("token");
        window.localStorage.removeItem("user");
      }
      return Promise.reject(refreshError);
    }
  }
);
