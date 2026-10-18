import { api } from "./axios";

export const adminAuthApi = {
  async login(payload) {
    const { data } = await api.post("/auth/admin/login", payload, { skipRefresh: true });
    return data;
  },
  async logout() {
    const { data } = await api.post("/auth/logout", null, { skipRefresh: true });
    return data;
  },
};
