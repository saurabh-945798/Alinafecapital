import { api } from "./axios";
const unwrap = (response) => response?.data?.data ?? response?.data ?? response;
export const financeApi = {
  async journal(params = {}) { return unwrap(await api.get("/admin/financial-journal", { params })); },
  async audit(params = {}) { return unwrap(await api.get("/admin/audit-trail", { params })); },
};
