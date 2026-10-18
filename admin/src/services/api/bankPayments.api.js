import { api } from "./axios";

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;

export const bankPaymentsApi = {
  async list(status = "ALL") { return unwrap(await api.get("/admin/bank-payments", { params: { status } })); },
  async get(id) { return unwrap(await api.get(`/admin/bank-payments/${id}`)); },
  async decide(id, payload) { return unwrap(await api.post(`/admin/bank-payments/${id}/decision`, payload)); },
};
