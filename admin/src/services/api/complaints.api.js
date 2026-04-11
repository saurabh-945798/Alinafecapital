import { api } from "./axios";

const normalize = (payload) => payload?.data || payload;

export const complaintsApi = {
  async list(params = {}) {
    const { data } = await api.get("/admin/complaints", { params });
    return normalize(data);
  },

  async update(id, payload) {
    const { data } = await api.patch(`/admin/complaints/${id}`, payload);
    return normalize(data);
  },
};
