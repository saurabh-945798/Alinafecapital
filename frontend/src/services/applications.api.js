import { api } from "./api";

const normalize = (payload) => payload?.data ?? payload;

export const applicationsApi = {
  async list(params = {}) {
    const { data } = await api.get("/applications", { params });
    return normalize(data);
  },

  async getById(id) {
    const { data } = await api.get(`/applications/${id}`);
    return normalize(data);
  },
};

