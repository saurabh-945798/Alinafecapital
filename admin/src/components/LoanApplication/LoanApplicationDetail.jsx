import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { inquiriesApi } from "../../services/api/inquiries.api";
import { complianceApi } from "../../services/api/compliance.api";
import { useToast } from "../../context/ToastContext.jsx";
import { ADMIN_FILE_BASE_URL, PUBLIC_APP_URL } from "../../config/api";

const STATUS_TONE = {
  NEW: "amber",
  CONTACTED: "blue",
  KYC_SENT: "blue",
  KYC_REJECTED: "red",
  APPROVED: "green",
  QUALIFIED: "green",
  CLOSED: "gray",
};

const KYC_TONE = {
  not_started: "gray",
  pending: "amber",
  verified: "green",
  rejected: "red",
};

const HUMAN_STATUS = {
  NEW: "Pending",
  CONTACTED: "Pending",
  KYC_SENT: "Needs KYC",
  KYC_REJECTED: "KYC Rejected",
  APPROVED: "Approved",
  QUALIFIED: "Approved",
  CLOSED: "Closed",
};

const HUMAN_KYC = {
  not_started: "Not Started",
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
};

const ACTION_STATUS_LABEL = {
  CONTACTED: "Pending",
  KYC_SENT: "Send KYC Link",
  KYC_REJECTED: "KYC Rejected",
  APPROVED: "Approved",
  CLOSED: "Closed",
};

const CLOSE_REASONS = [
  { value: "customer_cancelled", label: "Customer Cancelled" },
  { value: "no_response", label: "No Response" },
  { value: "duplicate", label: "Duplicate Inquiry" },
  { value: "not_eligible", label: "Not Eligible" },
  { value: "other", label: "Other" },
];

const DOC_LABEL = {
  national_id: "National ID",
  bank_statement_3_months: "Bank Statement",
  payslip_or_business_proof: "Payslip / Business Proof",
  address_proof: "Address Proof",
};

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
};

const escapeHtml = (value = "") =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const toWhatsappNumber = (phone = "") => {
  const digits = String(phone || "").replace(/[^\d]/g, "");
  if (!digits) return "";
  if (digits.startsWith("265")) return digits;
  if (digits.startsWith("0")) return `265${digits.slice(1)}`;
  if (digits.length === 9) return `265${digits}`;
  return digits;
};

const buildWhatsappLink = (item, nextStatus, rejectionReason = "") => {
  const phone = toWhatsappNumber(item?.phone);
  if (!phone) return "";

  const customerName = item?.fullName || "Customer";
  const loanName = item?.loanProductName || item?.loanProductSlug || "loan request";
  const status = String(nextStatus || "").toUpperCase();
  const publicAccessToken = String(item?.publicAccessToken || "").trim();
  const profileLink = publicAccessToken
    ? `${PUBLIC_APP_URL.replace(/\/$/, "")}/profile-kyc/${publicAccessToken}`
    : "";

  const kycSentMessage = profileLink
    ? `Hello ${customerName}, thank you for your ${loanName} request. Please complete your profile and KYC form using this secure link: ${profileLink}. Once you finish it, we will continue with your review.`
    : `Hello ${customerName}, thank you for your ${loanName} request. Our team will share your profile and KYC form link shortly so we can continue with your review.`;
  const kycRejectedMessage = profileLink
    ? `Hello ${customerName}, your KYC requires correction. Reason: ${rejectionReason}. Please fill the form again using this link: ${profileLink}`
    : `Hello ${customerName}, your KYC requires correction. Reason: ${rejectionReason}. Our team will share your KYC form link shortly.`;

  const messageMap = {
    NEW: `Hello ${customerName}, we have received your ${loanName} request at Alinafe Capital. Your request is now under review and our team will contact you soon.`,
    CONTACTED: `Hello ${customerName}, our team is now contacting you regarding your ${loanName} request. Please keep your phone available as we will guide you on the next steps shortly.`,
    KYC_SENT: kycSentMessage,
    KYC_REJECTED: kycRejectedMessage,
    APPROVED: `Hello ${customerName}, your ${loanName} request has been successfully approved. Please visit the branch to continue and receive your funds.`,
    CLOSED: `Hello ${customerName}, your ${loanName} request has now been closed. Please contact Alinafe Capital if you need any clarification.`,
    QUALIFIED: `Hello ${customerName}, your ${loanName} request has been successfully approved. Please visit the branch to continue and receive your funds.`,
  };

  const message =
    messageMap[status] ||
    `Hello ${customerName}, your ${loanName} request is currently under review by Alinafe Capital. We will contact you soon.`;

  return `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}&type=phone_number&app_absent=0`;
};

const getEffectiveWhatsappStatus = (item, nextStatus) => {
  if (nextStatus) return nextStatus;
  if (item?.status === "KYC_REJECTED" || item?.kycStatus === "rejected") return "KYC_REJECTED";
  if (item?.status === "KYC_SENT") return "KYC_SENT";
  if (item?.status === "APPROVED") return "APPROVED";
  if (item?.status === "CLOSED") return "CLOSED";
  if (item?.status === "CONTACTED" || item?.status === "NEW") return "CONTACTED";
  return item?.status || "";
};

export default function LoanApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [adminNote, setAdminNote] = useState("");
  const [nextStatus, setNextStatus] = useState("");
  const [closeReason, setCloseReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const hasSubmittedKyc =
    item?.kycStatus === "pending" ||
    item?.kycStatus === "verified" ||
    item?.kycStatus === "rejected" ||
    Boolean(item?.submittedAt) ||
    Array.isArray(item?.documents) && item.documents.length > 0;

  const resolveAssetUrl = (fileUrl = "") => {
    if (!fileUrl) return "";
    if (fileUrl.startsWith("http")) return fileUrl;
    return `${ADMIN_FILE_BASE_URL}${fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`}`;
  };

  const loadDetail = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await inquiriesApi.getById(id);
      setItem(data || null);
      setAdminNote(data?.adminNote || "");
      setCloseReason(data?.closeReason || "");
      setAvatarBroken(false);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load inquiry details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const updateInquiry = async () => {
    if (!item?._id || !nextStatus) return;
    setActionLoading(true);
    setError("");
    try {
      if ((nextStatus === "APPROVED" || nextStatus === "KYC_REJECTED") && !hasSubmittedKyc) {
        throw new Error("Customer has not submitted Profile + KYC yet.");
      }

      if (nextStatus === "APPROVED" && item.kycStatus !== "verified") {
        await complianceApi.verifyKyc(`inquiry:${item._id}`);
      }

      if (nextStatus === "KYC_REJECTED") {
        const reason = String(adminNote || "").trim();
        if (!reason) {
          throw new Error("Add the KYC rejection reason before updating.");
        }
        await complianceApi.rejectKyc(`inquiry:${item._id}`, reason);
      }

      if (nextStatus === "CLOSED" && !String(closeReason || "").trim()) {
        throw new Error("Select the close reason before updating.");
      }

      const updated = await inquiriesApi.update(item._id, {
        status: nextStatus,
        adminNote,
        closeReason: nextStatus === "CLOSED" ? closeReason : "",
      });
      setItem(updated);
      setAdminNote(updated?.adminNote || "");
      setCloseReason(updated?.closeReason || "");
      setNextStatus("");
      toast.success("Loan inquiry updated.");
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to update loan inquiry.";
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const openWhatsapp = async () => {
    const effectiveStatus = getEffectiveWhatsappStatus(item, nextStatus);
    if (!effectiveStatus) {
      toast.error("Select the inquiry status first.");
      return;
    }

    let rejectionReason = String(adminNote || "").trim();
    if (effectiveStatus === "KYC_REJECTED" && !rejectionReason) {
      const enteredReason = window.prompt("Enter the reason for KYC rejection:");
      rejectionReason = String(enteredReason || "").trim();
      if (!rejectionReason) {
        toast.warning("KYC rejection reason is required before sending WhatsApp.");
        return;
      }
      setAdminNote(rejectionReason);
    }

    let effectiveItem = item;

    try {
      if (effectiveStatus === "KYC_SENT" && item?.status !== "KYC_SENT") {
        const updated = await inquiriesApi.update(item._id, {
          status: "KYC_SENT",
          adminNote,
          closeReason: "",
        });
        setItem(updated);
        effectiveItem = updated;
      }

      if (effectiveStatus === "KYC_REJECTED" && (item?.status !== "KYC_REJECTED" || item?.kycStatus !== "rejected")) {
        if (!hasSubmittedKyc) {
          toast.error("Customer has not submitted Profile + KYC yet.");
          return;
        }
        await complianceApi.rejectKyc(`inquiry:${item._id}`, rejectionReason);
        const updated = await inquiriesApi.update(item._id, {
          status: "KYC_REJECTED",
          adminNote: rejectionReason,
          closeReason: "",
        });
        setItem(updated);
        setAdminNote(updated?.adminNote || rejectionReason);
        effectiveItem = updated;
      }
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Failed to prepare WhatsApp message.";
      setError(msg);
      toast.error(msg);
      return;
    }

    const href = buildWhatsappLink(effectiveItem, effectiveStatus, rejectionReason);
    if (!href) {
      toast.error("WhatsApp number is not available for this customer.");
      return;
    }

    window.open(href, "_blank", "noopener,noreferrer");
  };

  const handlePrint = () => {
    if (!item) return;

    const docs = Array.isArray(item.documents) ? item.documents : [];
    const avatarSrc =
      item.avatarUrl && !avatarBroken ? resolveAssetUrl(item.avatarUrl) : "";
    const docRows = docs.length
      ? docs
          .map(
            (doc) => `
              <tr>
                <td>${escapeHtml(DOC_LABEL[doc.type] || doc.type || "-")}</td>
                <td>${escapeHtml(doc.mime || "-")}</td>
                <td>${escapeHtml(formatDate(doc.uploadedAt))}</td>
              </tr>
            `
          )
          .join("")
      : `<tr><td colspan="3">No documents uploaded</td></tr>`;

    const timelineItems = [
      ["Inquiry Created", formatDate(item.createdAt)],
      ["Customer Contacted", formatDate(item.contactedAt)],
      ["KYC Sent", formatDate(item.kycSentAt)],
      ["KYC Submitted", formatDate(item.submittedAt)],
      ["KYC Verified", formatDate(item.verifiedAt)],
      ["KYC Rejected", formatDate(item.rejectedAt)],
      ["Approved", formatDate(item.approvedAt)],
      ["Closed", formatDate(item.closedAt)],
    ]
      .filter(([, value]) => value !== "-")
      .map(
        ([label, value]) => `
          <div class="timeline-item">
            <div class="timeline-label">${escapeHtml(label)}</div>
            <div class="timeline-value">${escapeHtml(value)}</div>
          </div>
        `
      )
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Loan Inquiry Record</title>
          <style>
            * { box-sizing: border-box; }
            body {
              margin: 0;
              padding: 24px;
              font-family: Arial, sans-serif;
              color: #0f172a;
              background: #ffffff;
            }
            .sheet {
              max-width: 960px;
              margin: 0 auto;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              gap: 24px;
              padding-bottom: 16px;
              border-bottom: 2px solid #0f172a;
            }
            .brand h1 {
              margin: 0;
              font-size: 28px;
              line-height: 1.1;
            }
            .brand p, .meta p {
              margin: 6px 0 0;
              font-size: 12px;
              color: #475569;
            }
            .meta {
              text-align: right;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 12px;
              margin-top: 18px;
            }
            .top-grid {
              display: grid;
              grid-template-columns: 1fr 160px;
              gap: 16px;
              align-items: stretch;
              margin-top: 18px;
            }
            .card, .section {
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              background: #fff;
            }
            .card {
              padding: 14px 16px;
            }
            .photo-card {
              border: 1px solid #cbd5e1;
              border-radius: 12px;
              padding: 12px;
              background: #fff;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 182px;
            }
            .photo-frame {
              width: 112px;
              height: 136px;
              border: 1px dashed #94a3b8;
              border-radius: 10px;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              background: #f8fafc;
            }
            .photo-frame img {
              width: 100%;
              height: 100%;
              object-fit: cover;
            }
            .photo-placeholder {
              padding: 12px;
              text-align: center;
              font-size: 12px;
              line-height: 1.4;
              color: #64748b;
            }
            .photo-caption {
              margin-top: 10px;
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #64748b;
            }
            .label {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #64748b;
            }
            .value {
              margin-top: 8px;
              font-size: 15px;
              font-weight: 700;
              color: #0f172a;
            }
            .subvalue {
              margin-top: 6px;
              font-size: 13px;
              color: #475569;
            }
            .section {
              margin-top: 16px;
              padding: 16px;
            }
            .section h2 {
              margin: 0 0 14px;
              font-size: 16px;
            }
            .grid-2 {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 14px;
            }
            .field {
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 12px;
              min-height: 72px;
            }
            .field-value {
              margin-top: 8px;
              font-size: 14px;
              color: #0f172a;
              white-space: pre-wrap;
              word-break: break-word;
            }
            .timeline {
              display: flex;
              flex-wrap: wrap;
              gap: 10px;
            }
            .timeline-item {
              min-width: 180px;
              border: 1px solid #e2e8f0;
              border-radius: 10px;
              padding: 10px 12px;
              background: #f8fafc;
            }
            .timeline-label {
              font-size: 11px;
              font-weight: 700;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #64748b;
            }
            .timeline-value {
              margin-top: 6px;
              font-size: 13px;
              color: #0f172a;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            th, td {
              border: 1px solid #cbd5e1;
              padding: 10px 12px;
              text-align: left;
              font-size: 13px;
              vertical-align: top;
            }
            th {
              background: #f8fafc;
              font-size: 11px;
              text-transform: uppercase;
              letter-spacing: 0.08em;
              color: #475569;
            }
            .office-grid {
              display: grid;
              grid-template-columns: repeat(2, 1fr);
              gap: 18px;
              margin-top: 8px;
            }
            .line {
              margin-top: 28px;
              border-top: 1px solid #64748b;
              height: 1px;
            }
            .line-label {
              margin-top: 6px;
              font-size: 12px;
              color: #64748b;
            }
            @media print {
              body { padding: 0; }
              .sheet { max-width: none; }
            }
          </style>
        </head>
        <body>
          <div class="sheet">
            <div class="header">
              <div class="brand">
                <h1>Alinafe Capital</h1>
                <p>Loan Inquiry Record</p>
              </div>
              <div class="meta">
                <p><strong>Printed:</strong> ${escapeHtml(formatDate(new Date().toISOString()))}</p>
                <p><strong>Record ID:</strong> ${escapeHtml(item._id || "-")}</p>
              </div>
            </div>

            <div class="top-grid">
              <div class="summary">
                <div class="card">
                  <div class="label">Customer</div>
                  <div class="value">${escapeHtml(item.fullName || "-")}</div>
                  <div class="subvalue">${escapeHtml(item.phone || "-")}</div>
                  <div class="subvalue">${escapeHtml(item.email || "-")}</div>
                </div>
                <div class="card">
                  <div class="label">Loan Request</div>
                  <div class="value">${escapeHtml(item.loanProductName || item.loanProductSlug || "-")}</div>
                  <div class="subvalue">Status: ${escapeHtml(HUMAN_STATUS[item.status] || item.status || "-")}</div>
                  <div class="subvalue">KYC: ${escapeHtml(HUMAN_KYC[item.kycStatus] || item.kycStatus || "Not Started")}</div>
                </div>
                <div class="card">
                  <div class="label">KYC Profile</div>
                  <div class="value">${escapeHtml(String(item.profileCompletion ?? 0))}% Complete</div>
                  <div class="subvalue">Submitted: ${escapeHtml(formatDate(item.submittedAt))}</div>
                  <div class="subvalue">Verified: ${escapeHtml(formatDate(item.verifiedAt))}</div>
                </div>
              </div>
              <div class="photo-card">
                <div class="photo-frame">
                  ${
                    avatarSrc
                      ? `<img src="${escapeHtml(avatarSrc)}" alt="Customer photo" />`
                      : `<div class="photo-placeholder">Paste passport photo here</div>`
                  }
                </div>
                <div class="photo-caption">Passport Photo</div>
              </div>
            </div>

            <div class="section">
              <h2>Applicant Details</h2>
              <div class="grid-2">
                <div class="field">
                  <div class="label">Address</div>
                  <div class="field-value">${escapeHtml(item.address || "-")}</div>
                </div>
                <div class="field">
                  <div class="label">Employment</div>
                  <div class="field-value">${escapeHtml(item.employmentType || "-")}${
                    String(item.employmentType || "").trim().toLowerCase() === "government employee" &&
                    item.governmentId
                      ? `<br/>Government ID: ${escapeHtml(item.governmentId)}`
                      : ""
                  }</div>
                </div>
                <div class="field">
                  <div class="label">Monthly Income</div>
                  <div class="field-value">${escapeHtml(item.monthlyIncome ? `MWK ${Number(item.monthlyIncome).toLocaleString()}` : "-")}</div>
                </div>
                <div class="field">
                  <div class="label">Bank Details</div>
                  <div class="field-value">${escapeHtml(item.bankName || "-")}<br/>${escapeHtml(item.accountNumber || "-")}<br/>${escapeHtml(item.branchCode || "-")}</div>
                </div>
                <div class="field">
                  <div class="label">Reference 1</div>
                  <div class="field-value">${escapeHtml(item.reference1Name || "-")}<br/>${escapeHtml(item.reference1Phone || "-")}</div>
                </div>
                <div class="field">
                  <div class="label">Reference 2</div>
                  <div class="field-value">${escapeHtml(item.reference2Name || "-")}<br/>${escapeHtml(item.reference2Phone || "-")}</div>
                </div>
              </div>
            </div>

            <div class="section">
              <h2>Customer Description</h2>
              <div class="field">
                <div class="field-value">${escapeHtml(item.notes || "-")}</div>
              </div>
            </div>

            <div class="section">
              <h2>Loan Journey Timeline</h2>
              <div class="timeline">
                ${timelineItems || `<div class="timeline-item"><div class="timeline-label">Status</div><div class="timeline-value">No recorded timeline events yet.</div></div>`}
              </div>
            </div>

            <div class="section">
              <h2>KYC Documents</h2>
              <table>
                <thead>
                  <tr>
                    <th>Document</th>
                    <th>Format</th>
                    <th>Uploaded At</th>
                  </tr>
                </thead>
                <tbody>
                  ${docRows}
                </tbody>
              </table>
            </div>

            <div class="section">
              <h2>Office File Use</h2>
              <div class="office-grid">
                <div>
                  <div class="line"></div>
                  <div class="line-label">Branch Name</div>
                </div>
                <div>
                  <div class="line"></div>
                  <div class="line-label">File Reference Number</div>
                </div>
                <div>
                  <div class="line"></div>
                  <div class="line-label">Received By</div>
                </div>
                <div>
                  <div class="line"></div>
                  <div class="line-label">Checked By</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `;

    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.right = "0";
    iframe.style.bottom = "0";
    iframe.style.width = "0";
    iframe.style.height = "0";
    iframe.style.border = "0";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      document.body.removeChild(iframe);
      toast.error("Unable to open print preview.");
      return;
    }

    doc.open();
    doc.write(html);
    doc.close();

    iframe.onload = () => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
      setTimeout(() => {
        if (document.body.contains(iframe)) {
          document.body.removeChild(iframe);
        }
      }, 1000);
    };
  };

  if (loading) {
    return <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">Loading details...</div>;
  }

  if (!item) {
    return <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">Inquiry not found.</div>;
  }

  const currentStage = (() => {
    if (item.status === "APPROVED") {
      return {
        title: "Approved",
        note: "Customer request is approved and ready for branch follow-up.",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    }
    if (item.status === "CLOSED") {
      return {
        title: "Closed",
        note: item.closeReason
          ? `This inquiry was closed. Reason: ${item.closeReason.replace(/_/g, " ")}.`
          : "This inquiry has been closed.",
        tone: "border-slate-200 bg-slate-50 text-slate-700",
      };
    }
    if (item.status === "KYC_REJECTED" || item.kycStatus === "rejected") {
      return {
        title: "KYC Correction Needed",
        note: "Customer needs to correct and resubmit profile or KYC details.",
        tone: "border-rose-200 bg-rose-50 text-rose-800",
      };
    }
    if (item.kycStatus === "pending") {
      return {
        title: "KYC Under Review",
        note: "Customer has submitted profile and KYC. Admin review is required.",
        tone: "border-amber-200 bg-amber-50 text-amber-800",
      };
    }
    if (item.status === "KYC_SENT" || item.kycStatus === "not_started") {
      return {
        title: "Waiting for Customer KYC",
        note: "Customer still needs to complete profile and upload KYC documents.",
        tone: "border-blue-200 bg-blue-50 text-blue-800",
      };
    }
    return {
      title: "Pending Follow-Up",
      note: "Inquiry is active and waiting for the next admin action.",
      tone: "border-amber-200 bg-amber-50 text-amber-800",
    };
  })();

  const actionHistory = Array.isArray(item.actionHistory) ? item.actionHistory : [];
  const availableStatuses = ["CONTACTED", "KYC_SENT", "KYC_REJECTED", "APPROVED", "CLOSED"].filter(
    (status) => status !== item.status
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Loan Inquiry Details</h1>
          <p className="text-sm text-slate-500">Review the full customer request and update the next step.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handlePrint}>
            Print Form
          </Button>
          <Button variant="outline" onClick={() => navigate("/admin/applications")}>
            Back
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className={`rounded-xl border px-4 py-4 ${currentStage.tone}`}>
        <p className="text-xs font-semibold uppercase tracking-wide">Current Stage</p>
        <h2 className="mt-1 text-lg font-semibold">{currentStage.title}</h2>
        <p className="mt-1 text-sm">{currentStage.note}</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 text-sm">
        <div className="rounded-lg border bg-white p-4">
          <div className="flex items-start gap-3">
            {item.avatarUrl && !avatarBroken ? (
              <img
                src={resolveAssetUrl(item.avatarUrl)}
                alt={item.fullName || "Customer"}
                className="h-16 w-16 rounded-full border border-slate-200 object-cover"
                onError={() => setAvatarBroken(true)}
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-700">
                {String(item.fullName || "U").trim().charAt(0).toUpperCase() || "U"}
              </div>
            )}

            <div className="min-w-0">
              <p className="text-xs text-slate-500">Customer</p>
              <p className="mt-1 font-semibold text-slate-900">{item.fullName}</p>
              <p className="mt-1 text-slate-700">{item.phone}</p>
              <p className="text-slate-700 break-all">{item.email || "-"}</p>
            </div>
          </div>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-slate-500">Loan Type</p>
          <p className="mt-1 font-semibold text-slate-900">{item.loanProductName || item.loanProductSlug}</p>
          <p className="mt-2 text-sm text-slate-700">
            Requested Amount: {item.requestedAmount ? `MWK ${Number(item.requestedAmount).toLocaleString()}` : "-"}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Tenure: {item.preferredTenureMonths ? `${item.preferredTenureMonths} months` : "-"}
          </p>
          <p className="mt-2 text-xs text-slate-500">Created: {formatDate(item.createdAt)}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-slate-500">Application Status</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={STATUS_TONE[item.status] || "gray"}>
              {HUMAN_STATUS[item.status] || item.status}
            </Badge>
            <Badge tone={KYC_TONE[item.kycStatus] || "gray"}>
              KYC: {HUMAN_KYC[item.kycStatus] || item.kycStatus || "Not Started"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-4">
        <div className="rounded-lg border p-3">
          <p className="text-sm font-semibold">Address</p>
          <p className="mt-2 text-sm text-slate-700">{item.address || "-"}</p>
        </div>

        <div className="rounded-lg border p-3">
          <p className="text-sm font-semibold">Description</p>
          <p className="mt-2 text-sm text-slate-700">{item.notes || "-"}</p>
        </div>

        <div className="rounded-lg border p-3 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold">KYC Overview</h3>
              <p className="text-xs text-slate-500">
                Review documents and take KYC action from this page.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge tone={KYC_TONE[item.kycStatus] || "gray"}>
                {HUMAN_KYC[item.kycStatus] || item.kycStatus || "Not Started"}
              </Badge>
              <Badge tone={(item.profileCompletion || 0) >= 100 ? "green" : "amber"}>
                Profile: {item.profileCompletion ?? 0}%
              </Badge>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Employment
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">{item.employmentType || "-"}</p>
              {String(item.employmentType || "").trim().toLowerCase() === "government employee" ? (
                <p className="mt-1 text-sm text-slate-600">
                  Government ID: {item.governmentId || "-"}
                </p>
              ) : null}
              <p className="mt-1 text-sm text-slate-600">
                Income: {item.monthlyIncome ? `MWK ${Number(item.monthlyIncome).toLocaleString()}` : "-"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Bank Details
              </p>
              <p className="mt-1 text-sm font-medium text-slate-900">{item.bankName || "-"}</p>
              <p className="mt-1 text-sm text-slate-600">{item.accountNumber || "-"}</p>
              <p className="mt-1 text-sm text-slate-600">{item.branchCode || "-"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Timeline
              </p>
              <p className="mt-1 text-sm text-slate-600">Submitted: {formatDate(item.submittedAt)}</p>
              <p className="mt-1 text-sm text-slate-600">Verified: {formatDate(item.verifiedAt)}</p>
              <p className="mt-1 text-sm text-slate-600">Rejected: {formatDate(item.rejectedAt)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                References
              </p>
              <div className="mt-1 space-y-2 text-sm text-slate-600">
                <div>
                  <p className="font-medium text-slate-900">{item.reference1Name || "-"}</p>
                  <p>{item.reference1Phone || "-"}</p>
                </div>
                <div>
                  <p className="font-medium text-slate-900">{item.reference2Name || "-"}</p>
                  <p>{item.reference2Phone || "-"}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-semibold">Uploaded Documents</p>
            {(item.documents || []).length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No documents uploaded yet.</p>
            ) : (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {(item.documents || []).map((doc, index) => (
                  <div
                    key={`${doc.type}-${index}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                      {DOC_LABEL[doc.type] || doc.type}
                    </p>
                    <p className="mt-1 text-sm text-slate-700">{doc.mime || "-"}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatDate(doc.uploadedAt)}</p>
                    {doc.fileUrl ? (
                      <a
                        href={resolveAssetUrl(doc.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-flex text-sm font-medium text-slate-900 underline"
                      >
                        Preview Document
                      </a>
                    ) : null}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        <div className="rounded-lg border p-3 space-y-3">
          <h3 className="text-sm font-semibold">Update Inquiry</h3>
          {!hasSubmittedKyc ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
              Customer has not submitted Profile + KYC yet. Use `Send KYC Link` to share the form, then wait for submission before approval or KYC rejection.
            </div>
          ) : null}
          <div className="grid gap-3 md:grid-cols-2">
            <select
              className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
              value={nextStatus}
              onChange={(e) => setNextStatus(e.target.value)}
            >
              <option value="">Select next status</option>
              {availableStatuses.map((status) => (
                <option key={status} value={status}>
                  {ACTION_STATUS_LABEL[status] || HUMAN_STATUS[status] || status}
                </option>
              ))}
            </select>

            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={1}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder={
                nextStatus === "KYC_REJECTED"
                  ? "Add KYC rejection reason"
                  : nextStatus === "KYC_SENT"
                    ? "Optional note for the customer"
                  : "Add admin note"
              }
            />

            {nextStatus === "CLOSED" ? (
              <select
                className="h-10 rounded-lg border border-slate-200 px-3 text-sm md:col-span-2"
                value={closeReason}
                onChange={(e) => setCloseReason(e.target.value)}
              >
                <option value="">Select close reason</option>
                {CLOSE_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>
                    {reason.label}
                  </option>
                ))}
              </select>
            ) : null}
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="outline" onClick={openWhatsapp}>
              {nextStatus ? "WP Preview" : "Send WP"}
            </Button>
            <Button
              disabled={
                !nextStatus ||
                actionLoading ||
                ((nextStatus === "APPROVED" || nextStatus === "KYC_REJECTED") && !hasSubmittedKyc) ||
                (nextStatus === "KYC_REJECTED" && !String(adminNote || "").trim()) ||
                (nextStatus === "CLOSED" && !String(closeReason || "").trim())
              }
              onClick={updateInquiry}
            >
              {actionLoading ? "Updating..." : "Update Inquiry"}
            </Button>
          </div>

          {nextStatus === "APPROVED" && hasSubmittedKyc ? (
            <p className="text-xs font-medium text-slate-600">
              Approving this inquiry will also mark the submitted KYC as verified.
            </p>
          ) : null}
          {nextStatus === "KYC_SENT" ? (
            <p className="text-xs font-medium text-slate-600">
              Click `WP Preview` to open the WhatsApp message with the profile + KYC link, then save this status.
            </p>
          ) : null}
          {nextStatus === "KYC_REJECTED" && !String(adminNote || "").trim() ? (
            <p className="text-xs font-medium text-rose-600">
              Add the KYC rejection reason before sending WhatsApp or saving.
            </p>
          ) : null}
          {nextStatus === "CLOSED" && !String(closeReason || "").trim() ? (
            <p className="text-xs font-medium text-rose-600">
              Select the close reason before saving.
            </p>
          ) : null}
        </div>

        <div className="rounded-lg border p-3 space-y-3">
          <h3 className="text-sm font-semibold">Action History</h3>
          {actionHistory.length === 0 ? (
            <p className="text-sm text-slate-500">No action history recorded yet.</p>
          ) : (
            <div className="space-y-3">
              {actionHistory
                .slice()
                .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
                .map((entry, index) => (
                  <div
                    key={`${entry.type || "entry"}-${entry.createdAt || index}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{entry.title || "Update"}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {entry.actor || "System"} · {formatDate(entry.createdAt)}
                        </p>
                      </div>
                      {entry.status ? (
                        <Badge tone={STATUS_TONE[entry.status] || "gray"}>
                          {HUMAN_STATUS[entry.status] || entry.status}
                        </Badge>
                      ) : null}
                    </div>
                    {entry.note ? (
                      <p className="mt-2 text-sm text-slate-600">{entry.note}</p>
                    ) : null}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
