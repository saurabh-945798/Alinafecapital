import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, ChevronDown, PencilLine, Save, X } from "lucide-react";
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
  VERIFIED: "green",
  APPROVED: "green",
  DISBURSED: "blue",
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
  KYC_SENT: "KYC",
  KYC_REJECTED: "KYC Rejected",
  VERIFIED: "Verified",
  APPROVED: "Approved",
  DISBURSED: "Disbursed",
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
  KYC_SENT: "KYC",
  KYC_REJECTED: "KYC Rejected",
  VERIFIED: "Verify",
  APPROVED: "Approved",
  DISBURSED: "Disburse",
  CLOSED: "Closed",
};

const CLOSE_REASONS = [
  { value: "customer_cancelled", label: "Customer Cancelled" },
  { value: "no_response", label: "No Response" },
  { value: "duplicate", label: "Duplicate Inquiry" },
  { value: "not_eligible", label: "Not Eligible" },
  { value: "other", label: "Other" },
];

const DISBURSEMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "mobile_money", label: "Mobile Money" },
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

const formatDateOnly = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleDateString();
};

const formatMoney = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  const amount = Number(value);
  return Number.isFinite(amount) ? `MWK ${amount.toLocaleString("en-US")}` : "-";
};

const resolveRepaymentConfig = (item) => {
  const text = `${item?.loanProductName || ""} ${item?.loanProductSlug || ""}`.toLowerCase();
  const base = {
    monthlyRate: 0.05,
    processingFeeRate: 0.025,
    adminFeeRate: 0.025,
    rateType: "reducing",
  };

  if (text.includes("business")) {
    return { ...base, monthlyRate: 0.075 };
  }

  if (
    text.includes("civil servant") ||
    text.includes("private company") ||
    text.includes("statutory company")
  ) {
    return base;
  }

  return base;
};

const calculateReducingInstallment = (principal, monthlyRate, months) => {
  if (principal <= 0 || monthlyRate <= 0 || months <= 0) return 0;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
};

const addMonths = (dateValue, monthsToAdd) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "-";
  date.setMonth(date.getMonth() + monthsToAdd);
  return date.toISOString();
};

const buildRepaymentPlan = (item) => {
  const principal = Number(item?.requestedAmount || 0);
  const months = Number(item?.preferredTenureMonths || 0);
  if (principal <= 0 || months <= 0) return null;

  const config = resolveRepaymentConfig(item);
  const emi = calculateReducingInstallment(principal, config.monthlyRate, months);
  const processingFee = principal * config.processingFeeRate;
  const oneTimeAdminFee = principal * config.adminFeeRate;
  const startDate =
    item?.disbursedAt || item?.approvedAt || item?.verifiedAt || item?.createdAt || new Date().toISOString();

  let balance = principal;
  const schedule = [];

  for (let month = 1; month <= months; month += 1) {
    const openingBalance = balance;
    const interest = openingBalance * config.monthlyRate;
    const principalPaid = Math.max(0, emi - interest);
    balance = Math.max(0, openingBalance - principalPaid);
    const fees = month === 1 ? processingFee + oneTimeAdminFee : 0;

    schedule.push({
      month,
      dueDate: addMonths(startDate, month),
      openingBalance,
      principalPaid,
      interest,
      fees,
      installment: emi + fees,
      closingBalance: balance,
    });
  }

  const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
  const totalFees = processingFee + oneTimeAdminFee;
  const totalRepayment = principal + totalInterest + totalFees;

  return {
    monthlyRate: config.monthlyRate,
    processingFee,
    oneTimeAdminFee,
    monthlyInstallment: emi,
    firstInstallment: schedule[0]?.installment || emi,
    totalInterest,
    totalFees,
    totalRepayment,
    schedule,
  };
};

const humanizeValue = (value = "") => {
  const normalized = String(value || "").trim();
  if (!normalized) return "-";
  return normalized.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
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
    VERIFIED: `Hello ${customerName}, your KYC has been verified successfully. Our team is now continuing the review of your ${loanName} request.`,
    APPROVED: `Hello ${customerName}, your ${loanName} request has been successfully approved. Please visit the branch to continue and receive your funds.`,
    DISBURSED: `Hello ${customerName}, your ${loanName} has now been disbursed successfully. Please keep your repayment schedule and branch communication for the next steps.`,
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
  if (item?.status === "DISBURSED") return "DISBURSED";
  if (item?.kycStatus === "verified" && item?.status !== "APPROVED" && item?.status !== "DISBURSED") return "VERIFIED";
  if (item?.kycStatus === "pending") return "KYC_SENT";
  if (item?.status === "KYC_REJECTED" || item?.kycStatus === "rejected") return "KYC_REJECTED";
  if (item?.status === "KYC_SENT") return "KYC_SENT";
  if (item?.status === "APPROVED") return "APPROVED";
  if (item?.status === "CLOSED") return "CLOSED";
  if (item?.status === "CONTACTED" || item?.status === "NEW") return "CONTACTED";
  return item?.status || "";
};

const getDisplayedStatusKey = (item) => {
  if (!item) return "";
  if (item.status === "DISBURSED") return "DISBURSED";
  if (item.status === "APPROVED") return "APPROVED";
  if (item.status === "CLOSED") return "CLOSED";
  if (item.kycStatus === "verified") return "VERIFIED";
  if (item.kycStatus === "pending") return "KYC_SENT";
  if (item.kycStatus === "rejected" || item.status === "KYC_REJECTED") return "KYC_REJECTED";
  if (item.status === "KYC_SENT") return "KYC_SENT";
  if (item.status === "CONTACTED" || item.status === "NEW") return "CONTACTED";
  return item.status || "";
};

const getHistoryStatusKey = (entry) => {
  if (!entry) return "";
  if (entry.type === "kyc_verified" || entry.status === "VERIFIED") return "VERIFIED";
  if (entry.type === "kyc_rejected" || entry.status === "KYC_REJECTED") return "KYC_REJECTED";
  if (entry.status === "APPROVED") return "APPROVED";
  if (entry.status === "DISBURSED") return "DISBURSED";
  if (entry.status === "CLOSED") return "CLOSED";
  if (entry.status === "KYC_SENT") return "KYC_SENT";
  if (entry.status === "CONTACTED" || entry.status === "NEW") return "CONTACTED";
  return entry.status || "";
};

const getStatusNotification = (status) => {
  const key = String(status || "").toUpperCase();

  const config = {
    KYC_SENT: {
      title: "KYC status updated",
      message: "The inquiry is now marked for KYC. You can use WhatsApp preview to send the KYC form link.",
      tone: "border-blue-200 bg-blue-50 text-blue-900",
      iconTone: "bg-blue-100 text-blue-600",
    },
    KYC_REJECTED: {
      title: "KYC rejected",
      message: "The KYC status has been rejected successfully. You can now send the rejection message to the customer.",
      tone: "border-rose-200 bg-rose-50 text-rose-900",
      iconTone: "bg-rose-100 text-rose-600",
    },
    VERIFIED: {
      title: "KYC verified",
      message: "The customer KYC has been verified successfully. The inquiry is now ready for loan approval.",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
      iconTone: "bg-emerald-100 text-emerald-600",
    },
    APPROVED: {
      title: "Loan approved",
      message: "The loan inquiry has been approved successfully. You can now send the approval message to the customer.",
      tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
      iconTone: "bg-emerald-100 text-emerald-600",
    },
    DISBURSED: {
      title: "Loan disbursed",
      message: "The approved loan has been marked as disbursed and moved into the accounts stage.",
      tone: "border-blue-200 bg-blue-50 text-blue-900",
      iconTone: "bg-blue-100 text-blue-600",
    },
    CLOSED: {
      title: "Inquiry closed",
      message: "The application has been closed successfully. The case is now marked as completed or inactive.",
      tone: "border-slate-200 bg-slate-50 text-slate-900",
      iconTone: "bg-slate-200 text-slate-700",
    },
  };

  return (
    config[key] || {
      title: "Inquiry updated",
      message: "The application status has been updated successfully.",
      tone: "border-slate-200 bg-slate-50 text-slate-900",
      iconTone: "bg-slate-200 text-slate-700",
    }
  );
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
  const [verifiedBy, setVerifiedBy] = useState("");
  const [approvedBy, setApprovedBy] = useState("");
  const [disbursedBy, setDisbursedBy] = useState("");
  const [disbursementAmount, setDisbursementAmount] = useState("");
  const [disbursementMethod, setDisbursementMethod] = useState("");
  const [disbursementBankName, setDisbursementBankName] = useState("");
  const [disbursementAccountName, setDisbursementAccountName] = useState("");
  const [disbursementAccountNumber, setDisbursementAccountNumber] = useState("");
  const [disbursementMobileProvider, setDisbursementMobileProvider] = useState("");
  const [disbursementMobileNumber, setDisbursementMobileNumber] = useState("");
  const [disbursementNote, setDisbursementNote] = useState("");
  const [editMode, setEditMode] = useState(false);
  const [detailsForm, setDetailsForm] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);
  const [inquiryDetailsOpen, setInquiryDetailsOpen] = useState(true);
  const [kycOpen, setKycOpen] = useState(true);
  const [repaymentOpen, setRepaymentOpen] = useState(true);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [whatsappReady, setWhatsappReady] = useState(false);
  const [statusNotice, setStatusNotice] = useState(null);
  const [docActionLoading, setDocActionLoading] = useState("");
  const [addDocName, setAddDocName] = useState("");
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
      setVerifiedBy(data?.verifiedBy || "");
      setApprovedBy(data?.approvedBy || "");
      setDisbursedBy(data?.disbursedBy || "");
      setDisbursementAmount(data?.disbursementAmount ?? data?.requestedAmount ?? "");
      setDisbursementMethod(data?.disbursementMethod || "");
      setDisbursementBankName(data?.disbursementBankName || "");
      setDisbursementAccountName(data?.disbursementAccountName || "");
      setDisbursementAccountNumber(data?.disbursementAccountNumber || "");
      setDisbursementMobileProvider(data?.disbursementMobileProvider || "");
      setDisbursementMobileNumber(data?.disbursementMobileNumber || "");
      setDisbursementNote(data?.disbursementNote || "");
      setDetailsForm({
        fullName: data?.fullName || "",
        phone: String(data?.phone || "").replace(/^\+/, ""),
        email: data?.email || "",
        address: data?.address || "",
        dateOfBirth: data?.dateOfBirth ? new Date(data.dateOfBirth).toISOString().slice(0, 10) : "",
        gender: data?.gender || "",
        maritalStatus: data?.maritalStatus || "",
        dependants: data?.dependants ?? "",
        housingStatus: data?.housingStatus || "",
        employmentStatus: data?.employmentStatus || "",
        borrowerType: data?.borrowerType || "",
        loanProductSlug: data?.loanProductSlug || "",
        loanProductName: data?.loanProductName || "",
        requestedAmount: data?.requestedAmount ?? "",
        preferredTenureMonths: data?.preferredTenureMonths ?? "",
        notes: data?.notes || "",
        addressLine1: data?.addressLine1 || "",
        city: data?.city || "",
        district: data?.district || "",
        country: data?.country || "Malawi",
        employmentType: data?.employmentType || "",
        governmentId: data?.governmentId || "",
        monthlyIncome: data?.monthlyIncome ?? "",
        bankName: data?.bankName || "",
        accountNumber: data?.accountNumber || "",
        branchCode: data?.branchCode || "",
        reference1Name: data?.reference1Name || "",
        reference1Phone: data?.reference1Phone || "",
        reference2Name: data?.reference2Name || "",
        reference2Phone: data?.reference2Phone || "",
      });
      setAvatarBroken(false);
      setWhatsappReady(false);
      setEditMode(false);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load inquiry details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const updateDetailsField = (name, value) => {
    setDetailsForm((prev) => ({ ...prev, [name]: value }));
  };

  const saveDetails = async () => {
    if (!item?._id || !detailsForm) return;
    setActionLoading(true);
    setError("");
    try {
      const updated = await inquiriesApi.update(item._id, {
        ...detailsForm,
        phone: detailsForm.phone.startsWith("+") ? detailsForm.phone : `+${detailsForm.phone}`,
        dependants: detailsForm.dependants === "" ? 0 : Number(detailsForm.dependants),
        requestedAmount: detailsForm.requestedAmount === "" ? 0 : Number(detailsForm.requestedAmount),
        preferredTenureMonths:
          detailsForm.preferredTenureMonths === "" ? 1 : Number(detailsForm.preferredTenureMonths),
        monthlyIncome: detailsForm.monthlyIncome === "" ? 0 : Number(detailsForm.monthlyIncome),
      });
      setItem(updated);
      setDetailsForm({
        fullName: updated?.fullName || "",
        phone: String(updated?.phone || "").replace(/^\+/, ""),
        email: updated?.email || "",
        address: updated?.address || "",
        dateOfBirth: updated?.dateOfBirth ? new Date(updated.dateOfBirth).toISOString().slice(0, 10) : "",
        gender: updated?.gender || "",
        maritalStatus: updated?.maritalStatus || "",
        dependants: updated?.dependants ?? "",
        housingStatus: updated?.housingStatus || "",
        employmentStatus: updated?.employmentStatus || "",
        borrowerType: updated?.borrowerType || "",
        loanProductSlug: updated?.loanProductSlug || "",
        loanProductName: updated?.loanProductName || "",
        requestedAmount: updated?.requestedAmount ?? "",
        preferredTenureMonths: updated?.preferredTenureMonths ?? "",
        notes: updated?.notes || "",
        addressLine1: updated?.addressLine1 || "",
        city: updated?.city || "",
        district: updated?.district || "",
        country: updated?.country || "Malawi",
        employmentType: updated?.employmentType || "",
        governmentId: updated?.governmentId || "",
        monthlyIncome: updated?.monthlyIncome ?? "",
        bankName: updated?.bankName || "",
        accountNumber: updated?.accountNumber || "",
        branchCode: updated?.branchCode || "",
        reference1Name: updated?.reference1Name || "",
        reference1Phone: updated?.reference1Phone || "",
        reference2Name: updated?.reference2Name || "",
        reference2Phone: updated?.reference2Phone || "",
      });
      setEditMode(false);
      setStatusNotice({
        title: "Details updated",
        message: "Customer and KYC details have been updated successfully.",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
        iconTone: "bg-emerald-100 text-emerald-600",
      });
      toast.success("Inquiry details updated.");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to save details.";
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const uploadAdminDoc = async (type, file, displayName) => {
    if (!item?._id || !file) return;
    const trimmedName = String(displayName || "").trim();
    if (!trimmedName) {
      const msg = "Document name is required.";
      setError(msg);
      toast.error(msg);
      return;
    }
    setDocActionLoading(`upload:${type}`);
    setError("");
    try {
      const updated = await inquiriesApi.uploadDoc(item._id, type, file, trimmedName);
      setItem(updated);
      setAddDocName("");
      toast.success("Document uploaded successfully.");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to upload document.";
      setError(msg);
      toast.error(msg);
    } finally {
      setDocActionLoading("");
    }
  };

  const removeAdminDoc = async (type) => {
    if (!item?._id) return;
    setDocActionLoading(`remove:${type}`);
    setError("");
    try {
      const updated = await inquiriesApi.removeDoc(item._id, type);
      setItem(updated);
      toast.success("Document removed successfully.");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to remove document.";
      setError(msg);
      toast.error(msg);
    } finally {
      setDocActionLoading("");
    }
  };

  const updateInquiry = async () => {
    if (!item?._id || !nextStatus) return;
    setActionLoading(true);
    setError("");
    const actionStatus = nextStatus;
    try {
      if ((actionStatus === "APPROVED" || actionStatus === "KYC_REJECTED" || actionStatus === "VERIFIED") && !hasSubmittedKyc) {
        throw new Error("Customer has not submitted Profile + KYC yet.");
      }

      if (actionStatus === "VERIFIED") {
        if (!String(verifiedBy || "").trim()) {
          throw new Error("Verified by is required before verifying KYC.");
        }
        if (item.kycStatus !== "verified") {
          await complianceApi.verifyKyc(`inquiry:${item._id}`, verifiedBy.trim());
        }
        await loadDetail();
        setNextStatus("");
        setWhatsappReady(true);
        setStatusNotice(getStatusNotification("VERIFIED"));
        toast.success("KYC verified.");
        return;
      }

      if (actionStatus === "APPROVED" && item.kycStatus !== "verified") {
        if (!String(verifiedBy || item.verifiedBy || "").trim()) {
          throw new Error("Verified by is required before approving the loan.");
        }
        await complianceApi.verifyKyc(
          `inquiry:${item._id}`,
          String(verifiedBy || item.verifiedBy).trim()
        );
      }

      if (actionStatus === "KYC_REJECTED") {
        const reason = String(adminNote || "").trim();
        if (!reason) {
          throw new Error("Add the KYC rejection reason before updating.");
        }
        await complianceApi.rejectKyc(`inquiry:${item._id}`, reason);
      }

      if (actionStatus === "CLOSED" && !String(closeReason || "").trim()) {
        throw new Error("Select the close reason before updating.");
      }

      if (actionStatus === "DISBURSED") {
        if (item.status !== "APPROVED") {
          throw new Error("Approve the loan before disbursement.");
        }
        if (!String(disbursedBy || "").trim()) {
          throw new Error("Disbursed by is required before disbursing the loan.");
        }
        if (!Number(disbursementAmount || 0)) {
          throw new Error("Disbursement amount is required before disbursing the loan.");
        }
        if (!String(disbursementMethod || "").trim()) {
          throw new Error("Disbursement method is required before disbursing the loan.");
        }
        if (disbursementMethod === "bank_transfer") {
          if (!String(disbursementBankName || "").trim()) {
            throw new Error("Bank name is required for bank transfer disbursement.");
          }
          if (!String(disbursementAccountName || "").trim()) {
            throw new Error("Account name is required for bank transfer disbursement.");
          }
          if (!String(disbursementAccountNumber || "").trim()) {
            throw new Error("Account number is required for bank transfer disbursement.");
          }
        }
        if (disbursementMethod === "mobile_money") {
          if (!String(disbursementMobileProvider || "").trim()) {
            throw new Error("Mobile money provider is required for mobile money disbursement.");
          }
          if (!String(disbursementMobileNumber || "").trim()) {
            throw new Error("Mobile money number is required for mobile money disbursement.");
          }
        }
      }

      const updated = await inquiriesApi.update(item._id, {
        status: actionStatus,
        adminNote,
        closeReason: actionStatus === "CLOSED" ? closeReason : "",
        approvedBy: actionStatus === "APPROVED" ? approvedBy.trim() : item?.approvedBy || "",
        disbursedBy: actionStatus === "DISBURSED" ? disbursedBy.trim() : item?.disbursedBy || "",
        disbursementAmount:
          actionStatus === "DISBURSED"
            ? Number(disbursementAmount || 0)
            : item?.disbursementAmount || 0,
        disbursementMethod:
          actionStatus === "DISBURSED" ? String(disbursementMethod || "").trim() : item?.disbursementMethod || "",
        disbursementBankName:
          actionStatus === "DISBURSED" ? String(disbursementBankName || "").trim() : item?.disbursementBankName || "",
        disbursementAccountName:
          actionStatus === "DISBURSED" ? String(disbursementAccountName || "").trim() : item?.disbursementAccountName || "",
        disbursementAccountNumber:
          actionStatus === "DISBURSED" ? String(disbursementAccountNumber || "").trim() : item?.disbursementAccountNumber || "",
        disbursementMobileProvider:
          actionStatus === "DISBURSED" ? String(disbursementMobileProvider || "").trim() : item?.disbursementMobileProvider || "",
        disbursementMobileNumber:
          actionStatus === "DISBURSED" ? String(disbursementMobileNumber || "").trim() : item?.disbursementMobileNumber || "",
        disbursementNote:
          actionStatus === "DISBURSED" ? String(disbursementNote || "").trim() : item?.disbursementNote || "",
      });
      setItem(updated);
      setAdminNote(updated?.adminNote || "");
      setCloseReason(updated?.closeReason || "");
      setVerifiedBy(updated?.verifiedBy || verifiedBy);
      setApprovedBy(updated?.approvedBy || "");
      setDisbursedBy(updated?.disbursedBy || "");
      setDisbursementAmount(updated?.disbursementAmount ?? updated?.requestedAmount ?? "");
      setDisbursementMethod(updated?.disbursementMethod || "");
      setDisbursementBankName(updated?.disbursementBankName || "");
      setDisbursementAccountName(updated?.disbursementAccountName || "");
      setDisbursementAccountNumber(updated?.disbursementAccountNumber || "");
      setDisbursementMobileProvider(updated?.disbursementMobileProvider || "");
      setDisbursementMobileNumber(updated?.disbursementMobileNumber || "");
      setDisbursementNote(updated?.disbursementNote || "");
      setNextStatus("");
      setWhatsappReady(true);
      setStatusNotice(getStatusNotification(actionStatus));
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
    const effectiveStatus = getEffectiveWhatsappStatus(item, "");
    if (!effectiveStatus) {
      toast.error("Update the inquiry status first.");
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
                <p><strong>Application No:</strong> ${escapeHtml(item.applicationCode || "-")}</p>
              </div>
            </div>

            <div class="top-grid">
              <div class="summary">
                <div class="card">
                  <div class="label">Customer</div>
                  <div class="value">${escapeHtml(item.fullName || "-")}</div>
                  <div class="subvalue">Application No: ${escapeHtml(item.applicationCode || "-")}</div>
                  <div class="subvalue">${escapeHtml(item.phone || "-")}</div>
                  <div class="subvalue">${escapeHtml(item.email || "-")}</div>
                </div>
                <div class="card">
                  <div class="label">Loan Request</div>
                  <div class="value">${escapeHtml(item.loanProductName || item.loanProductSlug || "-")}</div>
                  <div class="subvalue">Status: ${escapeHtml(HUMAN_STATUS[getDisplayedStatusKey(item)] || getDisplayedStatusKey(item) || "-")}</div>
                  <div class="subvalue">KYC: ${escapeHtml(HUMAN_KYC[item.kycStatus] || item.kycStatus || "Not Started")}</div>
                </div>
                <div class="card">
                  <div class="label">KYC Profile</div>
                  <div class="value">${escapeHtml(String(item.profileCompletion ?? 0))}% Complete</div>
                  <div class="subvalue">Submitted: ${escapeHtml(formatDate(item.submittedAt))}</div>
                  <div class="subvalue">Verified: ${escapeHtml(formatDate(item.verifiedAt))}</div>
                  <div class="subvalue">Verified By: ${escapeHtml(item.verifiedBy || "-")}</div>
                  <div class="subvalue">Approved By: ${escapeHtml(item.approvedBy || "-")}</div>
                  <div class="subvalue">Disbursed By: ${escapeHtml(item.disbursedBy || "-")}</div>
                  <div class="subvalue">Method: ${escapeHtml(humanizeValue(item.disbursementMethod || "-"))}</div>
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
                  <div class="field-value">${escapeHtml(item.monthlyIncome ? `MWK ${Number(item.monthlyIncome).toLocaleString("en-US")}` : "-")}</div>
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
              <h2>Approval Details</h2>
              <div class="grid-2">
                <div class="field">
                  <div class="label">Verified By</div>
                  <div class="field-value">${escapeHtml(item.verifiedBy || "-")}</div>
                </div>
                <div class="field">
                  <div class="label">Verified At</div>
                  <div class="field-value">${escapeHtml(formatDate(item.verifiedAt))}</div>
                </div>
                <div class="field">
                  <div class="label">Approved By</div>
                  <div class="field-value">${escapeHtml(item.approvedBy || "-")}</div>
                </div>
                <div class="field">
                  <div class="label">Approved At</div>
                  <div class="field-value">${escapeHtml(formatDate(item.approvedAt))}</div>
                </div>
                <div class="field">
                  <div class="label">Disbursed By</div>
                  <div class="field-value">${escapeHtml(item.disbursedBy || "-")}</div>
                </div>
                <div class="field">
                  <div class="label">Disbursement Method</div>
                  <div class="field-value">${escapeHtml(humanizeValue(item.disbursementMethod || "-"))}</div>
                </div>
                <div class="field">
                  <div class="label">Disbursed At</div>
                  <div class="field-value">${escapeHtml(formatDate(item.disbursedAt))}</div>
                </div>
                <div class="field">
                  <div class="label">Transaction Reference</div>
                  <div class="field-value">${escapeHtml(item.transactionReference || "-")}</div>
                </div>
              </div>
              ${
                item.disbursementMethod === "bank_transfer"
                  ? `
              <div class="grid two-col" style="margin-top: 12px;">
                <div class="field">
                  <div class="label">Bank Name</div>
                  <div class="field-value">${escapeHtml(item.disbursementBankName || "-")}</div>
                </div>
                <div class="field">
                  <div class="label">Account Name</div>
                  <div class="field-value">${escapeHtml(item.disbursementAccountName || "-")}</div>
                </div>
                <div class="field">
                  <div class="label">Account Number</div>
                  <div class="field-value">${escapeHtml(item.disbursementAccountNumber || "-")}</div>
                </div>
              </div>`
                  : item.disbursementMethod === "mobile_money"
                  ? `
              <div class="grid two-col" style="margin-top: 12px;">
                <div class="field">
                  <div class="label">Mobile Provider</div>
                  <div class="field-value">${escapeHtml(item.disbursementMobileProvider || "-")}</div>
                </div>
                <div class="field">
                  <div class="label">Mobile Number</div>
                  <div class="field-value">${escapeHtml(item.disbursementMobileNumber || "-")}</div>
                </div>
              </div>`
                  : ""
              }
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

  const handleSchedulePrint = () => {
    if (!item || !repaymentPlan) return;

    const scheduleRows = repaymentPlan.schedule
      .map(
        (row) => `
          <tr>
            <td>${row.month}</td>
            <td>${escapeHtml(formatDateOnly(row.dueDate))}</td>
            <td>${escapeHtml(formatMoney(row.openingBalance))}</td>
            <td>${escapeHtml(formatMoney(row.principalPaid))}</td>
            <td>${escapeHtml(formatMoney(row.interest))}</td>
            <td>${escapeHtml(formatMoney(row.fees))}</td>
            <td>${escapeHtml(formatMoney(row.installment))}</td>
            <td>${escapeHtml(formatMoney(row.closingBalance))}</td>
          </tr>
        `
      )
      .join("");

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Repayment Schedule</title>
          <style>
            * { box-sizing: border-box; }
            body { font-family: Arial, sans-serif; color: #0f172a; margin: 24px; }
            h1, h2, p { margin: 0; }
            .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; }
            .title { font-size: 24px; font-weight: 700; }
            .sub { font-size: 12px; color: #475569; margin-top: 6px; }
            .grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
            .card { border: 1px solid #cbd5e1; border-radius: 12px; padding: 12px; background: #f8fafc; }
            .label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; margin-bottom: 6px; font-weight: 700; }
            .value { font-size: 16px; font-weight: 700; color: #0f172a; }
            .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; margin-bottom: 20px; }
            .meta-item { border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #cbd5e1; padding: 9px 10px; font-size: 12px; text-align: left; }
            th { background: #f8fafc; font-weight: 700; }
          </style>
        </head>
        <body>
          <div class="header">
            <div>
              <h1 class="title">Repayment Schedule</h1>
              <p class="sub">Application No: ${escapeHtml(item.applicationCode || "-")}</p>
              <p class="sub">Generated: ${escapeHtml(formatDate(new Date().toISOString()))}</p>
            </div>
            <div>
              <p class="sub"><strong>Customer:</strong> ${escapeHtml(item.fullName || "-")}</p>
              <p class="sub"><strong>Loan:</strong> ${escapeHtml(item.loanProductName || item.loanProductSlug || "-")}</p>
            </div>
          </div>

          <div class="grid">
            <div class="card"><div class="label">Approved Amount</div><div class="value">${escapeHtml(formatMoney(item.requestedAmount))}</div></div>
            <div class="card"><div class="label">Monthly Rate</div><div class="value">${(repaymentPlan.monthlyRate * 100).toFixed(1)}%</div></div>
            <div class="card"><div class="label">First Payment</div><div class="value">${escapeHtml(formatMoney(repaymentPlan.firstInstallment))}</div></div>
            <div class="card"><div class="label">Total Repayment</div><div class="value">${escapeHtml(formatMoney(repaymentPlan.totalRepayment))}</div></div>
          </div>

          <div class="meta">
            <div class="meta-item"><strong>Monthly Installment:</strong> ${escapeHtml(formatMoney(repaymentPlan.monthlyInstallment))}</div>
            <div class="meta-item"><strong>Tenure:</strong> ${escapeHtml(`${item.preferredTenureMonths || "-"} months`)}</div>
            <div class="meta-item"><strong>Processing Fee:</strong> ${escapeHtml(formatMoney(repaymentPlan.processingFee))}</div>
            <div class="meta-item"><strong>Admin Fee:</strong> ${escapeHtml(formatMoney(repaymentPlan.oneTimeAdminFee))}</div>
            <div class="meta-item"><strong>Verified By:</strong> ${escapeHtml(item.verifiedBy || "-")}</div>
            <div class="meta-item"><strong>Approved By:</strong> ${escapeHtml(item.approvedBy || "-")}</div>
            <div class="meta-item"><strong>Disbursed By:</strong> ${escapeHtml(item.disbursedBy || "-")}</div>
            <div class="meta-item"><strong>Method:</strong> ${escapeHtml(humanizeValue(item.disbursementMethod || "-"))}</div>
          </div>

          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Due Date</th>
                <th>Opening Balance</th>
                <th>Principal</th>
                <th>Interest</th>
                <th>Fees</th>
                <th>Installment</th>
                <th>Closing Balance</th>
              </tr>
            </thead>
            <tbody>
              ${scheduleRows}
            </tbody>
          </table>
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
      toast.error("Unable to open schedule preview.");
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

  const displayedStatusKey = getDisplayedStatusKey(item);

  const currentStage = (() => {
    if (item.status === "DISBURSED") {
      return {
        title: "Disbursed",
        note: "Funds have been released and this case has moved into the accounts stage.",
        tone: "border-blue-200 bg-blue-50 text-blue-800",
      };
    }
    if (item.status === "APPROVED") {
      return {
        title: "Approved",
        note: "Customer request is approved and ready for loan disbursement.",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    }
    if (item.kycStatus === "verified") {
      return {
        title: "KYC Verified",
        note: "KYC is complete and verified. The loan can now move to approval when ready.",
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
    if (item.kycStatus === "pending") {
      if (item.status === "KYC_REJECTED") {
        return {
          title: "KYC Submitted Again",
          note: "Customer has submitted the profile and KYC again. Review the updated details and make the next decision.",
          tone: "border-amber-200 bg-amber-50 text-amber-800",
        };
      }
      return {
        title: "KYC Under Review",
        note: "Customer has submitted profile and KYC. Admin review is required.",
        tone: "border-amber-200 bg-amber-50 text-amber-800",
      };
    }
    if (item.status === "KYC_REJECTED" || item.kycStatus === "rejected") {
      return {
        title: "KYC Correction Needed",
        note: "Customer needs to correct and resubmit profile or KYC details.",
        tone: "border-rose-200 bg-rose-50 text-rose-800",
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
  const availableStatuses = (() => {
    if (item?.status === "DISBURSED") return ["CLOSED"];
    if (item?.status === "APPROVED") return ["DISBURSED", "CLOSED"];
    if (item?.status === "CLOSED") return [];
    if (item?.kycStatus === "verified") return ["APPROVED", "CLOSED"];
    if (item?.kycStatus === "pending") return ["KYC_REJECTED", "VERIFIED", "CLOSED"];
    if (item?.kycStatus === "rejected") return ["KYC_SENT", "CLOSED"];
    return ["KYC_SENT", "CLOSED"];
  })();
  const repaymentPlan =
    item?.kycStatus === "verified" || item?.status === "APPROVED" || item?.status === "DISBURSED"
      ? buildRepaymentPlan(item)
      : null;
  const visibleHistory = actionHistory
    .slice()
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  const nextAction = (() => {
    if (item.status === "DISBURSED") {
      return {
        title: "Moved to Accounts",
        note: "This loan is already disbursed. Use the Accounts section for repayment and portfolio tracking.",
        tone: "border-blue-200 bg-blue-50 text-blue-800",
      };
    }
    if (item.status === "APPROVED") {
      return {
        title: "Ready for loan disbursement",
        note: "Approval is complete. Capture disbursement details next to move this case into Accounts.",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    }
    if (item.status === "CLOSED") {
      return {
        title: "Case is closed",
        note: "No more customer action is required unless you reopen the operational process manually.",
        tone: "border-slate-200 bg-slate-50 text-slate-700",
      };
    }
    if (!hasSubmittedKyc) {
      return {
        title: "Send KYC link",
        note: "Customer has not submitted Profile + KYC yet. Send the KYC form link on WhatsApp first.",
        tone: "border-blue-200 bg-blue-50 text-blue-800",
      };
    }
    if (item.kycStatus === "pending") {
      if (item.status === "KYC_REJECTED") {
        return {
          title: "Customer submitted KYC again",
          note: "The customer has resubmitted the KYC form. Review the new documents and then verify or reject it again if needed.",
          tone: "border-amber-200 bg-amber-50 text-amber-800",
        };
      }
      return {
        title: "Review submitted KYC",
        note: "Check the uploaded documents, then verify KYC or reject it with a reason.",
        tone: "border-amber-200 bg-amber-50 text-amber-800",
      };
    }
    if (item.kycStatus === "verified") {
      return {
        title: "Ready for loan approval",
        note: "KYC is already verified. Approve the loan when the case is ready.",
        tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
      };
    }
    if (item.kycStatus === "rejected" || item.status === "KYC_REJECTED") {
      return {
        title: "KYC Rejected",
        note: "KYC is currently rejected. Review the reason and wait for the next customer update.",
        tone: "border-rose-200 bg-rose-50 text-rose-800",
      };
    }
    return {
      title: "Review customer request",
      note: "Start with the customer details, then choose the next action from the buttons below.",
      tone: "border-amber-200 bg-amber-50 text-amber-800",
    };
  })();

  return (
    <>
      {statusNotice ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
          <div className={`w-full max-w-lg rounded-[28px] border p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)] ${statusNotice.tone}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl ${statusNotice.iconTone}`}>
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em]">Application Update</p>
                  <h2 className="mt-2 text-2xl font-bold">{statusNotice.title}</h2>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setStatusNotice(null)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-current/15 bg-white/60 text-current transition hover:bg-white/80"
                aria-label="Close status notification"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-5 text-sm leading-7">{statusNotice.message}</p>
            <div className="mt-6 flex justify-end">
              <Button onClick={() => setStatusNotice(null)}>Close</Button>
            </div>
          </div>
        </div>
      ) : null}

    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Loan Inquiry Details</h1>
          <p className="text-sm text-slate-500">Review the full customer request and update the next step.</p>
          <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Application No: {item.applicationCode || "-"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => setEditMode((prev) => !prev)}>
            {editMode ? (
              <>
                <X size={16} /> Cancel Edit
              </>
            ) : (
              <>
                <PencilLine size={16} /> Edit Details
              </>
            )}
          </Button>
          {editMode ? (
            <Button variant="outline" onClick={saveDetails} disabled={actionLoading}>
              <Save size={16} />
              {actionLoading ? "Saving..." : "Save Details"}
            </Button>
          ) : null}
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
            Requested Amount: {item.requestedAmount ? `MWK ${Number(item.requestedAmount).toLocaleString("en-US")}` : "-"}
          </p>
          <p className="mt-1 text-sm text-slate-700">
            Tenure: {item.preferredTenureMonths ? `${item.preferredTenureMonths} months` : "-"}
          </p>
          <p className="mt-2 text-xs text-slate-500">Created: {formatDate(item.createdAt)}</p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-slate-500">Application Status</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone={STATUS_TONE[displayedStatusKey] || "gray"}>
              {HUMAN_STATUS[displayedStatusKey] || displayedStatusKey}
            </Badge>
            <Badge tone={KYC_TONE[item.kycStatus] || "gray"}>
              KYC: {HUMAN_KYC[item.kycStatus] || item.kycStatus || "Not Started"}
            </Badge>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border px-4 py-4 ${nextAction.tone}`}>
        <p className="text-xs font-semibold uppercase tracking-wide">Needs Attention</p>
        <h2 className="mt-1 text-lg font-semibold">{nextAction.title}</h2>
        <p className="mt-1 text-sm">{nextAction.note}</p>
      </div>

      <div className="rounded-xl border bg-white p-4 space-y-4">
        <div className="rounded-lg border p-4">
          <button
            type="button"
            onClick={() => setInquiryDetailsOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Loan Inquiry Form Details</h3>
              <p className="mt-1 text-xs text-slate-500">
                Complete snapshot of everything submitted by the customer in the public inquiry form.
              </p>
            </div>
            <ChevronDown
              className={[
                "h-4 w-4 text-slate-500 transition-transform duration-200",
                inquiryDetailsOpen ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>

          {inquiryDetailsOpen ? (
            <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Full Name
              </p>
              {editMode ? (
                <input className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.fullName || ""} onChange={(e) => updateDetailsField("fullName", e.target.value)} />
              ) : (
                <p className="mt-1 text-sm font-medium text-slate-900">{item.fullName || "-"}</p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Phone
              </p>
              {editMode ? (
                <input className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.phone || ""} onChange={(e) => updateDetailsField("phone", e.target.value)} />
              ) : (
                <p className="mt-1 text-sm font-medium text-slate-900">{item.phone || "-"}</p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Email
              </p>
              {editMode ? (
                <input className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.email || ""} onChange={(e) => updateDetailsField("email", e.target.value)} />
              ) : (
                <p className="mt-1 text-sm font-medium text-slate-900 break-all">{item.email || "-"}</p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Date of Birth
              </p>
              {editMode ? (
                <input type="date" className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.dateOfBirth || ""} onChange={(e) => updateDetailsField("dateOfBirth", e.target.value)} />
              ) : (
                <p className="mt-1 text-sm font-medium text-slate-900">{formatDateOnly(item.dateOfBirth)}</p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Gender
              </p>
              {editMode ? (
                <select className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.gender || ""} onChange={(e) => updateDetailsField("gender", e.target.value)}>
                  <option value="">Select gender</option><option value="male">Male</option><option value="female">Female</option>
                </select>
              ) : (
                <p className="mt-1 text-sm font-medium text-slate-900">{humanizeValue(item.gender)}</p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Marital Status
              </p>
              {editMode ? (
                <select className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.maritalStatus || ""} onChange={(e) => updateDetailsField("maritalStatus", e.target.value)}>
                  <option value="">Select marital status</option><option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option><option value="widowed">Widowed</option>
                </select>
              ) : (
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {humanizeValue(item.maritalStatus)}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Dependants
              </p>
              {editMode ? (
                <input type="number" className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.dependants ?? ""} onChange={(e) => updateDetailsField("dependants", e.target.value)} />
              ) : (
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {Number.isFinite(item.dependants) ? item.dependants : "-"}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Housing Status
              </p>
              {editMode ? (
                <select className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.housingStatus || ""} onChange={(e) => updateDetailsField("housingStatus", e.target.value)}>
                  <option value="">Select housing status</option><option value="tenant">Tenant</option><option value="home_owner">Home Owner</option>
                </select>
              ) : (
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {humanizeValue(item.housingStatus)}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Employment Status
              </p>
              {editMode ? (
                <select className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.employmentStatus || ""} onChange={(e) => updateDetailsField("employmentStatus", e.target.value)}>
                  <option value="">Select employment status</option><option value="employed">Employed</option><option value="not_employed">Not Employed</option>
                </select>
              ) : (
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {humanizeValue(item.employmentStatus)}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Borrower Type
              </p>
              {editMode ? (
                <select className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.borrowerType || ""} onChange={(e) => updateDetailsField("borrowerType", e.target.value)}>
                  <option value="">Select borrower type</option><option value="first_time">First Time</option><option value="repeat">Repeat</option>
                </select>
              ) : (
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {humanizeValue(item.borrowerType)}
                </p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Requested Amount
              </p>
              {editMode ? (
                <input type="number" className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.requestedAmount ?? ""} onChange={(e) => updateDetailsField("requestedAmount", e.target.value)} />
              ) : (
                <p className="mt-1 text-sm font-medium text-slate-900">{formatMoney(item.requestedAmount)}</p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Tenure
              </p>
              {editMode ? (
                <input type="number" className="mt-2 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.preferredTenureMonths ?? ""} onChange={(e) => updateDetailsField("preferredTenureMonths", e.target.value)} />
              ) : (
                <p className="mt-1 text-sm font-medium text-slate-900">
                  {item.preferredTenureMonths ? `${item.preferredTenureMonths} months` : "-"}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-3 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Address
              </p>
              {editMode ? (
                <textarea className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" rows={3} value={detailsForm?.address || ""} onChange={(e) => updateDetailsField("address", e.target.value)} />
              ) : (
                <p className="mt-2 text-sm text-slate-700">{item.address || "-"}</p>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Description
              </p>
              {editMode ? (
                <textarea className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" rows={3} value={detailsForm?.notes || ""} onChange={(e) => updateDetailsField("notes", e.target.value)} />
              ) : (
                <p className="mt-2 text-sm text-slate-700">{item.notes || "-"}</p>
              )}
            </div>
          </div>
            </div>
          ) : null}
        </div>

        <div className="rounded-lg border p-3">
          <button
            type="button"
            onClick={() => setKycOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900">KYC Overview</h3>
              <p className="mt-1 text-xs text-slate-500">
                Review documents and take KYC action from this page.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge tone={KYC_TONE[item.kycStatus] || "gray"}>
                {HUMAN_KYC[item.kycStatus] || item.kycStatus || "Not Started"}
              </Badge>
              <Badge tone={(item.profileCompletion || 0) >= 100 ? "green" : "amber"}>
                Profile: {item.profileCompletion ?? 0}%
              </Badge>
              <ChevronDown
                className={[
                  "h-4 w-4 text-slate-500 transition-transform duration-200",
                  kycOpen ? "rotate-180" : "",
                ].join(" ")}
              />
            </div>
          </button>

          {kycOpen ? (
            <div className="mt-4 space-y-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Employment
              </p>
              {editMode ? (
                <div className="mt-2 space-y-2">
                  <input className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.employmentType || ""} onChange={(e) => updateDetailsField("employmentType", e.target.value)} placeholder="Employment type" />
                  {String(detailsForm?.employmentType || "").trim().toLowerCase() === "government employee" ? (
                    <input className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.governmentId || ""} onChange={(e) => updateDetailsField("governmentId", e.target.value)} placeholder="Government ID" />
                  ) : null}
                  <input type="number" className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.monthlyIncome ?? ""} onChange={(e) => updateDetailsField("monthlyIncome", e.target.value)} placeholder="Monthly income" />
                </div>
              ) : (
                <>
                  <p className="mt-1 text-sm font-medium text-slate-900">{item.employmentType || "-"}</p>
                  {String(item.employmentType || "").trim().toLowerCase() === "government employee" ? (
                    <p className="mt-1 text-sm text-slate-600">
                      Government ID: {item.governmentId || "-"}
                    </p>
                  ) : null}
                  <p className="mt-1 text-sm text-slate-600">
                    Income: {item.monthlyIncome ? `MWK ${Number(item.monthlyIncome).toLocaleString("en-US")}` : "-"}
                  </p>
                </>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Bank Details
              </p>
              {editMode ? (
                <div className="mt-2 space-y-2">
                  <input className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.bankName || ""} onChange={(e) => updateDetailsField("bankName", e.target.value)} placeholder="Bank name" />
                  <input className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.accountNumber || ""} onChange={(e) => updateDetailsField("accountNumber", e.target.value)} placeholder="Account number" />
                  <input className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.branchCode || ""} onChange={(e) => updateDetailsField("branchCode", e.target.value)} placeholder="Branch code" />
                </div>
              ) : (
                <>
                  <p className="mt-1 text-sm font-medium text-slate-900">{item.bankName || "-"}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.accountNumber || "-"}</p>
                  <p className="mt-1 text-sm text-slate-600">{item.branchCode || "-"}</p>
                </>
              )}
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Timeline
              </p>
              <p className="mt-1 text-sm text-slate-600">Submitted: {formatDate(item.submittedAt)}</p>
              <p className="mt-1 text-sm text-slate-600">Verified: {formatDate(item.verifiedAt)}</p>
              <p className="mt-1 text-sm text-slate-600">Verified By: {item.verifiedBy || "-"}</p>
              <p className="mt-1 text-sm text-slate-600">Rejected: {formatDate(item.rejectedAt)}</p>
              <p className="mt-1 text-sm text-slate-600">Approved By: {item.approvedBy || "-"}</p>
              <p className="mt-1 text-sm text-slate-600">Disbursed By: {item.disbursedBy || "-"}</p>
              <p className="mt-1 text-sm text-slate-600">
                Method: {humanizeValue(item.disbursementMethod || "-")}
              </p>
              {item.disbursementMethod === "bank_transfer" ? (
                <>
                  <p className="mt-1 text-sm text-slate-600">Bank: {item.disbursementBankName || "-"}</p>
                  <p className="mt-1 text-sm text-slate-600">Account Name: {item.disbursementAccountName || "-"}</p>
                  <p className="mt-1 text-sm text-slate-600">Account Number: {item.disbursementAccountNumber || "-"}</p>
                </>
              ) : null}
              {item.disbursementMethod === "mobile_money" ? (
                <>
                  <p className="mt-1 text-sm text-slate-600">Provider: {item.disbursementMobileProvider || "-"}</p>
                  <p className="mt-1 text-sm text-slate-600">Mobile Number: {item.disbursementMobileNumber || "-"}</p>
                </>
              ) : null}
              <p className="mt-1 text-sm text-slate-600">
                Transaction Ref: {item.transactionReference || "-"}
              </p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                References
              </p>
              {editMode ? (
                <div className="mt-2 space-y-2">
                  <input className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.reference1Name || ""} onChange={(e) => updateDetailsField("reference1Name", e.target.value)} placeholder="Reference 1 name" />
                  <input className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.reference1Phone || ""} onChange={(e) => updateDetailsField("reference1Phone", e.target.value)} placeholder="Reference 1 phone" />
                  <input className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.reference2Name || ""} onChange={(e) => updateDetailsField("reference2Name", e.target.value)} placeholder="Reference 2 name" />
                  <input className="h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm" value={detailsForm?.reference2Phone || ""} onChange={(e) => updateDetailsField("reference2Phone", e.target.value)} placeholder="Reference 2 phone" />
                </div>
              ) : (
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
              )}
            </div>
          </div>

          <div className="rounded-lg border border-slate-200 p-3">
            <p className="text-sm font-semibold">Uploaded Documents</p>
            {(item.documents || []).length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No documents uploaded yet.</p>
            ) : (
              <div className="mt-3 overflow-hidden rounded-lg border border-slate-200">
                <div className="hidden grid-cols-[1.3fr_0.9fr_1.4fr] gap-3 bg-slate-50 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500 md:grid">
                  <span>Document</span>
                  <span>Uploaded</span>
                  <span>Actions</span>
                </div>
                <div className="divide-y divide-slate-200">
                  {(item.documents || []).map((doc, index) => (
                    <div
                      key={`${doc.type}-${index}`}
                      className="grid gap-3 px-4 py-4 md:grid-cols-[1.3fr_0.9fr_1.4fr] md:items-center"
                    >
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:hidden">
                          Document
                        </p>
                        <p className="text-sm font-medium text-slate-900">
                          {String(doc.displayName || "").trim() || DOC_LABEL[doc.type] || humanizeValue(doc.type)}
                        </p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:hidden">
                          Uploaded
                        </p>
                        <p className="text-sm text-slate-600">{formatDate(doc.uploadedAt)}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 md:hidden">
                          Actions
                        </p>
                        {doc.fileUrl ? (
                          editMode ? (
                            <div className="flex flex-wrap items-center gap-2">
                              <a
                                href={resolveAssetUrl(doc.fileUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                              >
                                Preview
                              </a>
                              <label className="inline-flex cursor-pointer items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50">
                                Replace
                                <input
                                  type="file"
                                  className="hidden"
                                  accept=".pdf,.png,.jpg,.jpeg"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) uploadAdminDoc(doc.type, file, doc.displayName || DOC_LABEL[doc.type] || humanizeValue(doc.type));
                                    e.target.value = "";
                                  }}
                                />
                              </label>
                              <button
                                type="button"
                                onClick={() => removeAdminDoc(doc.type)}
                                disabled={docActionLoading === `remove:${doc.type}`}
                                className="inline-flex items-center rounded-lg border border-rose-200 px-3 py-2 text-xs font-medium text-rose-700 transition hover:bg-rose-50 disabled:opacity-60"
                              >
                                {docActionLoading === `remove:${doc.type}` ? "Removing..." : "Remove"}
                              </button>
                            </div>
                          ) : (
                            <a
                              href={resolveAssetUrl(doc.fileUrl)}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center rounded-lg border border-slate-300 px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
                            >
                              Preview
                            </a>
                          )
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {editMode ? (
              <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Add Document
                </p>
                <div className="mt-3">
                  <div>
                    <label className="text-xs font-medium uppercase tracking-wide text-slate-500">
                      Document Name
                    </label>
                    <input
                      value={addDocName}
                      onChange={(e) => setAddDocName(e.target.value)}
                      className="mt-2 h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-800"
                      placeholder="Enter document name"
                    />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="flex min-h-11 cursor-pointer items-center justify-between rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-700 transition hover:bg-slate-50">
                    <span>Add document</span>
                    <span className="text-xs font-medium text-slate-500">Choose file</span>
                    <input
                      type="file"
                      className="hidden"
                      accept=".pdf,.png,.jpg,.jpeg"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadAdminDoc("", file, addDocName);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <p className="mt-2 text-xs text-slate-500">
                    Admin can write the document name directly and then upload the file.
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          {repaymentPlan ? (
            <div className="rounded-lg border border-slate-200 p-3">
              <button
                type="button"
                onClick={() => setRepaymentOpen((prev) => !prev)}
                className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left"
              >
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Repayment Schedule</h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Preview the verified repayment plan before sending or saving as PDF.
                  </p>
                </div>
                <ChevronDown
                  className={[
                    "h-4 w-4 text-slate-500 transition-transform duration-200",
                    repaymentOpen ? "rotate-180" : "",
                  ].join(" ")}
                />
              </button>

              {repaymentOpen ? (
                <div className="mt-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    <Button variant="outline" onClick={handleSchedulePrint}>
                      Download Schedule
                    </Button>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Monthly Rate</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {(repaymentPlan.monthlyRate * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">First Payment</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {formatMoney(repaymentPlan.firstInstallment)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Processing Fee</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {formatMoney(repaymentPlan.processingFee)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Admin Fee</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {formatMoney(repaymentPlan.oneTimeAdminFee)}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Monthly Installment</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {formatMoney(repaymentPlan.monthlyInstallment)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total Interest</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {formatMoney(repaymentPlan.totalInterest)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-slate-200 bg-white px-3 py-3">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total Repayment</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {formatMoney(repaymentPlan.totalRepayment)}
                      </p>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="min-w-full divide-y divide-slate-200 text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                          <th className="px-3 py-3">Month</th>
                          <th className="px-3 py-3">Due Date</th>
                          <th className="px-3 py-3">Opening</th>
                          <th className="px-3 py-3">Principal</th>
                          <th className="px-3 py-3">Interest</th>
                          <th className="px-3 py-3">Fees</th>
                          <th className="px-3 py-3">Installment</th>
                          <th className="px-3 py-3">Closing</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 bg-white">
                        {repaymentPlan.schedule.map((row) => (
                          <tr key={row.month}>
                            <td className="px-3 py-3 text-slate-900">{row.month}</td>
                            <td className="px-3 py-3 text-slate-700">{formatDateOnly(row.dueDate)}</td>
                            <td className="px-3 py-3 text-slate-700">{formatMoney(row.openingBalance)}</td>
                            <td className="px-3 py-3 text-slate-700">{formatMoney(row.principalPaid)}</td>
                            <td className="px-3 py-3 text-slate-700">{formatMoney(row.interest)}</td>
                            <td className="px-3 py-3 text-slate-700">{formatMoney(row.fees)}</td>
                            <td className="px-3 py-3 font-medium text-slate-900">{formatMoney(row.installment)}</td>
                            <td className="px-3 py-3 text-slate-700">{formatMoney(row.closingBalance)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
            </div>
          ) : null}

        </div>

        <div className="rounded-lg border p-3 space-y-3">
          <h3 className="text-sm font-semibold">Next Actions</h3>
          {!hasSubmittedKyc ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-800">
              Customer has not submitted Profile + KYC yet. Use `Send KYC Link` to share the form, then wait for submission before approval or KYC rejection.
            </div>
          ) : null}
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {availableStatuses.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setNextStatus(status);
                  setWhatsappReady(false);
                }}
                className={[
                  "min-h-11 rounded-xl border px-3 py-2 text-sm font-semibold transition",
                  nextStatus === status
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                {ACTION_STATUS_LABEL[status] || HUMAN_STATUS[status] || status}
              </button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2">
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

            {(nextStatus === "VERIFIED" || nextStatus === "APPROVED") ? (
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Verified By
                </label>
                <input
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                  value={verifiedBy}
                  onChange={(e) => setVerifiedBy(e.target.value)}
                  placeholder="Enter verifier name"
                />
              </div>
            ) : null}

            {nextStatus === "APPROVED" ? (
              <div className="space-y-1 md:col-span-2">
                <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Approved By
                </label>
                <input
                  className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                  value={approvedBy}
                  onChange={(e) => setApprovedBy(e.target.value)}
                  placeholder="Enter approver name"
                />
              </div>
            ) : null}

            {nextStatus === "DISBURSED" ? (
              <>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Disbursed By
                  </label>
                  <input
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    value={disbursedBy}
                    onChange={(e) => setDisbursedBy(e.target.value)}
                    placeholder="Enter disbursement officer name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Disbursement Amount
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    value={disbursementAmount}
                    onChange={(e) => setDisbursementAmount(e.target.value)}
                    placeholder="Enter amount"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Disbursement Method
                  </label>
                  <select
                    className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                    value={disbursementMethod}
                    onChange={(e) => {
                      const value = e.target.value;
                      setDisbursementMethod(value);
                      if (value !== "bank_transfer") {
                        setDisbursementBankName("");
                        setDisbursementAccountName("");
                        setDisbursementAccountNumber("");
                      }
                      if (value !== "mobile_money") {
                        setDisbursementMobileProvider("");
                        setDisbursementMobileNumber("");
                      }
                    }}
                  >
                    <option value="">Select method</option>
                    {DISBURSEMENT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
                {disbursementMethod === "bank_transfer" ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Bank Name
                      </label>
                      <input
                        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                        value={disbursementBankName}
                        onChange={(e) => setDisbursementBankName(e.target.value)}
                        placeholder="Enter bank name"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Account Name
                      </label>
                      <input
                        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                        value={disbursementAccountName}
                        onChange={(e) => setDisbursementAccountName(e.target.value)}
                        placeholder="Enter account name"
                      />
                    </div>
                    <div className="space-y-1 md:col-span-2">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Account Number
                      </label>
                      <input
                        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                        value={disbursementAccountNumber}
                        onChange={(e) => setDisbursementAccountNumber(e.target.value)}
                        placeholder="Enter account number"
                      />
                    </div>
                  </>
                ) : null}
                {disbursementMethod === "mobile_money" ? (
                  <>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Provider
                      </label>
                      <input
                        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                        value={disbursementMobileProvider}
                        onChange={(e) => setDisbursementMobileProvider(e.target.value)}
                        placeholder="Airtel Money / TNM Mpamba"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Mobile Number
                      </label>
                      <input
                        className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
                        value={disbursementMobileNumber}
                        onChange={(e) => setDisbursementMobileNumber(e.target.value)}
                        placeholder="Enter mobile money number"
                      />
                    </div>
                  </>
                ) : null}
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3 text-sm text-slate-600 md:col-span-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Transaction Reference
                  </p>
                  <p className="mt-2 font-medium text-slate-900">
                    {item?.transactionReference || "System generated on disbursement"}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    This reference is created automatically when the loan is disbursed.
                  </p>
                </div>
                <div className="space-y-1 md:col-span-2">
                  <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Disbursement Note
                  </label>
                  <textarea
                    rows={2}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    value={disbursementNote}
                    onChange={(e) => setDisbursementNote(e.target.value)}
                    placeholder="Optional note for accounts or branch follow-up"
                  />
                </div>
              </>
            ) : null}
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
            <Button
              disabled={
                !nextStatus ||
                actionLoading ||
                ((nextStatus === "APPROVED" || nextStatus === "KYC_REJECTED" || nextStatus === "VERIFIED") && !hasSubmittedKyc) ||
                (nextStatus === "KYC_REJECTED" && !String(adminNote || "").trim()) ||
                (nextStatus === "CLOSED" && !String(closeReason || "").trim()) ||
                ((nextStatus === "VERIFIED" || nextStatus === "APPROVED") && !String(verifiedBy || "").trim()) ||
                (nextStatus === "APPROVED" && !String(approvedBy || "").trim()) ||
                (nextStatus === "DISBURSED" && item?.status !== "APPROVED") ||
                (nextStatus === "DISBURSED" && !String(disbursedBy || "").trim()) ||
                (nextStatus === "DISBURSED" && !Number(disbursementAmount || 0)) ||
                (nextStatus === "DISBURSED" && !String(disbursementMethod || "").trim()) ||
                (nextStatus === "DISBURSED" &&
                  disbursementMethod === "bank_transfer" &&
                  (!String(disbursementBankName || "").trim() ||
                    !String(disbursementAccountName || "").trim() ||
                    !String(disbursementAccountNumber || "").trim())) ||
                (nextStatus === "DISBURSED" &&
                  disbursementMethod === "mobile_money" &&
                  (!String(disbursementMobileProvider || "").trim() ||
                    !String(disbursementMobileNumber || "").trim()))
              }
              onClick={updateInquiry}
            >
              {actionLoading ? "Updating..." : "Update Inquiry"}
            </Button>
            <Button
              variant="outline"
              onClick={openWhatsapp}
              disabled={actionLoading || !whatsappReady}
            >
              WP Preview
            </Button>
          </div>

          {nextStatus === "VERIFIED" && hasSubmittedKyc ? (
            <p className="text-xs font-medium text-slate-600">
              This verifies KYC only. Add the verifier name before saving.
            </p>
          ) : null}
          {nextStatus === "APPROVED" && hasSubmittedKyc ? (
            <p className="text-xs font-medium text-slate-600">
              Add both verifier and approver names. Approving this inquiry will also mark the submitted KYC as verified.
            </p>
          ) : null}
          {nextStatus === "DISBURSED" ? (
            <p className="text-xs font-medium text-slate-600">
              Capture the method details correctly. Bank transfer requires account details, while mobile money requires provider and number.
            </p>
          ) : null}
          {nextStatus === "KYC_SENT" ? (
            <p className="text-xs font-medium text-slate-600">
              Save the inquiry first. After that, `WP Preview` will open the WhatsApp message with the KYC form link.
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
          {nextStatus ? (
            <p className="text-xs font-medium text-slate-600">
              Update the inquiry first. WhatsApp preview is enabled only after the status is saved.
            </p>
          ) : whatsappReady ? (
            <p className="text-xs font-medium text-slate-600">
              Status saved. You can now use `WP Preview` to send the WhatsApp message.
            </p>
          ) : (
            <p className="text-xs font-medium text-slate-600">
              Select a status first. After saving it, `WP Preview` will become available.
            </p>
          )}
        <div className="rounded-lg border p-3">
          <button
            type="button"
            onClick={() => setHistoryOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left"
          >
            <div>
              <h3 className="text-sm font-semibold text-slate-900">Action History</h3>
              <p className="mt-1 text-xs text-slate-500">
                {actionHistory.length} {actionHistory.length === 1 ? "entry" : "entries"}
              </p>
            </div>
            <ChevronDown
              className={[
                "h-4 w-4 text-slate-500 transition-transform duration-200",
                historyOpen ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>

          {historyOpen ? (
            actionHistory.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No action history recorded yet.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {visibleHistory.map((entry, index) => {
                  const historyStatusKey = getHistoryStatusKey(entry);

                  return (
                    <div
                      key={`${entry.type || "entry"}-${entry.createdAt || index}`}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{entry.title || "Update"}</p>
                          <p className="mt-1 text-xs text-slate-500">
                            {entry.actor || "System"} - {formatDate(entry.createdAt)}
                          </p>
                        </div>
                        {historyStatusKey ? (
                          <Badge tone={STATUS_TONE[historyStatusKey] || "gray"}>
                            {HUMAN_STATUS[historyStatusKey] || historyStatusKey}
                          </Badge>
                        ) : null}
                      </div>
                      {entry.note ? (
                        <p className="mt-2 text-sm text-slate-600">{entry.note}</p>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )
          ) : null}
        </div>
        </div>
      </div>
    </div>
    </>
  );
}
