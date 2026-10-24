import { api } from "./axios";

const toProtectedApiPath = (fileUrl = "") => {
  const raw = String(fileUrl || "").trim();
  if (!raw) return "";

  let pathname = raw;
  try {
    if (/^https?:\/\//i.test(raw)) pathname = new URL(raw).pathname;
  } catch {
    pathname = raw;
  }

  if (pathname.startsWith("/api/v1/files/")) return pathname.replace(/^\/api\/v1/, "");
  if (pathname.startsWith("/files/")) return pathname;
  if (pathname.startsWith("/uploads/kyc/")) return pathname.replace("/uploads/kyc/", "/files/kyc/");
  // Current bank-payment responses already return /api/v1/files/payments/:id/pop.
  // Keep legacy upload paths out of direct browser navigation; protected routes
  // must be used for any payment proof.
  if (pathname.startsWith("/uploads/payments/")) throw new Error("Legacy payment document URL cannot be opened directly. Refresh the payment record and try again.");
  return pathname;
};

export const protectedFilesApi = {
  async fetchBlob(fileUrl) {
    const path = toProtectedApiPath(fileUrl);
    if (!path) throw new Error("Document URL is missing.");
    const { data } = await api.get(path, { responseType: "blob", timeout: 60000 });
    return data;
  },

  async open(fileUrl) {
    const blob = await this.fetchBlob(fileUrl);
    const objectUrl = URL.createObjectURL(blob);
    const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");
    if (!opened) {
      URL.revokeObjectURL(objectUrl);
      throw new Error("Your browser blocked the document preview. Allow pop-ups for the Admin Portal and try again.");
    }
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
  },
};
