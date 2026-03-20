import { api } from "./axios";

const normalize = (payload) => payload?.data || payload;

export const dashboardApi = {
  async getSummary() {
    const { data } = await api.get("/admin/dashboard/summary");
    return normalize(data);
  },
};
