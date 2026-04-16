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

  async addPayment(id, payload) {
    const { data } = await api.post(`/admin/accounts/${id}/payments`, payload);
    return normalize(data);
  },

  async updatePayment(id, paymentId, payload) {
    const { data } = await api.patch(`/admin/accounts/${id}/payments/${paymentId}`, payload);
    return normalize(data);
  },

  async deletePayment(id, paymentId) {
    const { data } = await api.delete(`/admin/accounts/${id}/payments/${paymentId}`);
    return normalize(data);
  },
};
