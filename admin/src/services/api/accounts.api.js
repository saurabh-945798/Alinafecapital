import { api } from "./axios";

const normalize = (payload) => payload?.data || payload;

export const accountsApi = {
  async list(params = {}) {
    const { data } = await api.get("/admin/accounts", { params });
    return normalize(data);
  },

  async getById(id) {
    const { data } = await api.get(`/admin/accounts/${id}`);
    return normalize(data);
  },
};
