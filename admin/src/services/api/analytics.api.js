import { api } from "./axios";

const normalize = (payload) => payload?.data || payload;

export const analyticsApi = {
  async getAnalyticsSummary(params = {}) {
    const { data } = await api.get("/admin/analytics/summary", { params });
    return normalize(data);
  },
};
