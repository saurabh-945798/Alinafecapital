import { api } from "./axios";

export const adminAuthApi = {
  async login(payload) {
    const { data } = await api.post("/auth/login", payload);
    return data;
  },
};

