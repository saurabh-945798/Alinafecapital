import { api } from "./axios";

const normalize = (payload) => payload?.data || payload;

export const inquiriesApi = {
  async list(params = {}) {
    const { data } = await api.get("/admin/inquiries", { params });
    return normalize(data);
  },

  async update(id, payload) {
    const { data } = await api.patch(`/admin/inquiries/${id}`, payload);
    return normalize(data);
  },
};

