import { api } from "./axios";

const normalize = (payload) => payload?.data || payload;

export const loanApplicationsApi = {
  async list(params = {}) {
    const { data } = await api.get("/admin/applications", { params });
    return normalize(data);
  },

  async getById(id) {
    const { data } = await api.get(`/admin/applications/${id}`);
    return normalize(data);
  },

  async updateStatus(id, payload) {
    const { data } = await api.patch(`/admin/applications/${id}/status`, payload);
    return normalize(data);
  },
};

