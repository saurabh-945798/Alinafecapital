import { api } from "./axios";

const normalize = (payload) => payload?.data || payload;

export const complianceApi = {
  async listKyc(params = {}) {
    const { data } = await api.get("/admin/kyc", { params });
    return normalize(data);
  },

  async verifyKyc(userId) {
    const { data } = await api.post(`/admin/kyc/${userId}/verify`);
    return normalize(data);
  },

  async rejectKyc(userId, remarks) {
    const { data } = await api.post(`/admin/kyc/${userId}/reject`, { remarks });
    return normalize(data);
  },
};

