import axios from "axios";
import { getActiveAdminKey } from "../../utils/adminAuth";
import { ADMIN_API_BASE_URL } from "../../config/api";

export const api = axios.create({
  baseURL: ADMIN_API_BASE_URL,
  timeout: 20000,
});

api.interceptors.request.use((config) => {
  const adminKey = getActiveAdminKey();
  if (adminKey) config.headers["x-admin-key"] = adminKey;
  return config;
});
