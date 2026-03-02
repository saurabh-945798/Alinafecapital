import { api } from "./api";

const extractAuthData = (payload) => {
  const data = payload?.data ?? payload ?? {};
  const token = data?.token || data?.accessToken || data?.data?.token || data?.data?.accessToken || "";
  const user = data?.user || data?.data?.user || null;
  const message = data?.message || data?.data?.message || "Success";

  if (token && user) {
    return { token, user, message };
  }

  return { token: "", user: null, message: data?.message || "Unexpected response" };
};

export const register = async (payload) => {
  const response = await api.post("/auth/register", payload);
  return extractAuthData(response?.data);
};

export const login = async (payload) => {
  const response = await api.post("/auth/login", payload);
  return extractAuthData(response?.data);
};

export default { register, login };
