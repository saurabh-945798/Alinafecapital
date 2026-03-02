import { api } from "./axios";

const normalize = (payload) => payload?.data || payload;

export const loanProductsApi = {
  async list(params = {}) {
    const { data } = await api.get("/admin/loan-products", { params });
    return normalize(data);
  },

  async create(payload) {
    const { data } = await api.post("/admin/loan-products", payload);
    return normalize(data);
  },

  async update(id, payload) {
    const { data } = await api.patch(`/admin/loan-products/${id}`, payload);
    return normalize(data);
  },

  async deactivate(id) {
    const { data } = await api.delete(`/admin/loan-products/${id}`);
    return normalize(data);
  },
};

