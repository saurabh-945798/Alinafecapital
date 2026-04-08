import { api } from "./axios";

const normalize = (payload) => payload?.data || payload;

export const inquiriesApi = {
  async list(params = {}) {
    const { data } = await api.get("/admin/inquiries", { params });
    return normalize(data);
  },

  async getById(id) {
    const { data } = await api.get(`/admin/inquiries/${id}`);
    return normalize(data);
  },

  async update(id, payload) {
    const { data } = await api.patch(`/admin/inquiries/${id}`, payload);
    return normalize(data);
  },

  async uploadDoc(id, type, file, displayName = "") {
    const payload = new FormData();
    payload.append("type", type);
    payload.append("displayName", displayName);
    payload.append("file", file);
    const { data } = await api.post(`/admin/inquiries/${id}/doc`, payload);
    return normalize(data);
  },

  async removeDoc(id, type) {
    const { data } = await api.delete(`/admin/inquiries/${id}/doc/${type}`);
    return normalize(data);
  },
};
