import { api } from "./axios";

const unwrap = (response) => response?.data?.data ?? response?.data ?? response;

export const riskApi = {
  async queue() { return unwrap(await api.get("/admin/risk/queue")); },
  async get(applicationId, type = "INQUIRY") { return unwrap(await api.get(`/admin/risk/assessments/${applicationId}`, { params: { type } })); },
  async save(applicationId, payload) { return unwrap(await api.put(`/admin/risk/assessments/${applicationId}`, payload)); },
  async submit(applicationId, payload) { return unwrap(await api.post(`/admin/risk/assessments/${applicationId}/submit`, payload)); },
  async reopen(applicationId, reason, applicationType = "INQUIRY") { return unwrap(await api.post(`/admin/risk/assessments/${applicationId}/reopen`, { reason, applicationType })); },
};
