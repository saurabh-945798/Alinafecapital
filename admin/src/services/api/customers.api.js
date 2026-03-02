import { api } from "./axios";

const normalize = (payload) => payload?.data || payload;

export const customersApi = {
  async list(params = {}) {
    const { data } = await api.get("/admin/customers", { params });
    return normalize(data);
  },

  async getById(id) {
    const { data } = await api.get(`/admin/customers/${id}`);
    return normalize(data);
  },
};

