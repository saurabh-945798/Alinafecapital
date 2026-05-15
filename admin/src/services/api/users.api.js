import { api } from "./axios";

const normalize = (payload) => payload?.data || payload;

export const usersApi = {
  async list() {
    const { data } = await api.get("/admin/users");
    return normalize(data);
  },

  async create(payload) {
    const { data } = await api.post("/admin/users", payload);
    return normalize(data);
  },

  async update(id, payload) {
    const { data } = await api.patch(`/admin/users/${id}`, payload);
    return normalize(data);
  },

  async resetPassword(id, password) {
    const { data } = await api.post(`/admin/users/${id}/reset-password`, { password });
    return normalize(data);
  },

  async remove(id) {
    const { data } = await api.delete(`/admin/users/${id}`);
    return normalize(data);
  },
};
