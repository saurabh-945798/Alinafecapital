import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { complianceApi } from "../../services/api/compliance.api";
import { useToast } from "../../context/ToastContext.jsx";
import { ADMIN_FILE_BASE_URL } from "../../config/api";

const KYC_STATUSES = ["pending", "verified", "rejected", "not_started", "all"];

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
};

const statusTone = (status) => {
  if (status === "verified") return "green";
  if (status === "rejected") return "red";
  if (status === "pending") return "amber";
  return "gray";
};

const DOC_LABEL = {
  national_id: "National ID (Malawi)",
  bank_statement_3_months: "Bank Statement (3 months)",
  payslip_or_business_proof: "Payslip / Business Proof",
  address_proof: "Address Proof",
};

const maskAccountNumber = (value) => {
  const raw = String(value || "").replace(/\s+/g, "");
  if (!raw) return "-";
  if (raw.length <= 4) return raw;
  return `${"*".repeat(Math.max(0, raw.length - 4))}${raw.slice(-4)}`;
};

const buildTimeline = (selected) => {
  if (!selected) return [];

  const base = [
    { label: "Inquiry Created", value: selected.createdAt },
    { label: "Customer Contacted", value: selected.contactedAt },
    { label: "KYC Link Sent", value: selected.kycSentAt },
    { label: "Profile + KYC Submitted", value: selected.submittedAt },
    { label: "KYC Verified", value: selected.verifiedAt },
    { label: "KYC Rejected", value: selected.rejectedAt },
    { label: "Loan Approved", value: selected.approvedAt },
    { label: "Inquiry Closed", value: selected.closedAt },
  ];

  if (selected.recordType !== "loan_inquiry") {
    return base.filter((item) =>
      ["Profile + KYC Submitted", "KYC Verified", "KYC Rejected"].includes(item.label)
    );
  }

  return base;
};

export default function CompliancePage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "all");
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [reviewFilter, setReviewFilter] = useState(searchParams.get("review") || "");
  const [page, setPage] = useState(Number(searchParams.get("page") || 1));
  const [limit] = useState(20);
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedReviewId, setSelectedReviewId] = useState("");
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [remarks, setRemarks] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showFullAccount, setShowFullAccount] = useState(false);
  const [avatarBroken, setAvatarBroken] = useState(false);

  const fileBase = ADMIN_FILE_BASE_URL;
  const resolveAssetUrl = (fileUrl = "") => {
    if (!fileUrl) return "";
    if (fileUrl.startsWith("http")) return fileUrl;
    return `${fileBase}${fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`}`;
  };

  const selected = useMemo(() => {
    const fromList = items.find((x) => String(x.reviewId) === String(selectedReviewId));
    return fromList || selectedRecord || null;
  }, [items, selectedReviewId, selectedRecord]);
  const timeline = useMemo(
    () => buildTimeline(selected).filter((item) => !!item.value),
    [selected]
  );

  const fetchKycList = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await complianceApi.listKyc({
        status: statusFilter,
        q,
        page,
        limit,
      });

      const nextItems = Array.isArray(data) ? data : data?.items || [];
      const nextPagination = data?.pagination || {
        page,
        limit,
        total: nextItems.length,
        totalPages: 1,
      };

      setItems(nextItems);
      setPagination(nextPagination);

      if (selectedReviewId) {
        const inList = nextItems.find((x) => String(x.reviewId) === String(selectedReviewId));
        if (inList) setSelectedRecord(inList);
      }
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load KYC queue.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKycList();
  }, [statusFilter, q, page, limit]);

  useEffect(() => {
    if (!reviewFilter || items.length === 0) return;
    const match = items.find((item) => String(item.reviewId) === String(reviewFilter));
    if (!match) return;
    setSelectedReviewId(String(match.reviewId));
    setSelectedRecord(match);
    setRemarks(match.kycRemarks || "");
    setShowFullAccount(false);
    setAvatarBroken(false);
  }, [items, reviewFilter]);

  useEffect(() => {
    setStatusFilter(searchParams.get("status") || "all");
    setQ(searchParams.get("q") || "");
    setReviewFilter(searchParams.get("review") || "");
    setPage(Number(searchParams.get("page") || 1));
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter) params.set("status", statusFilter);
    if (q) params.set("q", q);
    if (reviewFilter) params.set("review", reviewFilter);
    if (page > 1) params.set("page", String(page));
    setSearchParams(params, { replace: true });
  }, [statusFilter, q, reviewFilter, page, setSearchParams]);

  const handleVerify = async () => {
    if (!selectedReviewId) return;
    setActionLoading(true);
    setError("");
    try {
      const updated = await complianceApi.verifyKyc(selectedReviewId);
      setSelectedRecord(updated || null);
      await fetchKycList();
      setRemarks("");
      toast.success("KYC verified successfully.");
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to verify KYC.";
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedReviewId) return;
    if (!remarks.trim()) {
      setError("Remarks are required to reject KYC.");
      toast.warning("Remarks are required to reject KYC.");
      return;
    }
    setActionLoading(true);
    setError("");
    try {
      const updated = await complianceApi.rejectKyc(selectedReviewId, remarks.trim());
      setSelectedRecord(updated || null);
      await fetchKycList();
      setRemarks("");
      toast.success("KYC rejected successfully.");
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to reject KYC.";
      setError(msg);
      toast.error(msg);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">KYC Review</h1>
        <p className="text-sm text-slate-500">
          Review submitted KYC documents and approve or reject them.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-2">
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="Search full name / email / phone / district"
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-slate-600">KYC Status:</span>
            {KYC_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={[
                  "rounded-full border px-3 py-1 text-xs font-semibold transition",
                  statusFilter === status
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
                ].join(" ")}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">User</th>
                <th className="px-4 py-3 text-left">KYC</th>
                <th className="px-4 py-3 text-left">Profile %</th>
                <th className="px-4 py-3 text-left">Bank Details</th>
                <th className="px-4 py-3 text-left">Updated</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-slate-500">
                    Loading KYC queue...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-slate-500">
                    No KYC records found for selected filter.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={String(item.reviewId || item.userId)} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{item.fullName || String(item.userId)}</p>
                      <p className="text-xs text-slate-500">{item.email || "-"}</p>
                      <p className="text-xs text-slate-500">{item.phone || "-"}</p>
                      <p className="text-xs text-slate-500">{item.country || "Malawi"}</p>
                      <p className="text-xs text-slate-500 capitalize">
                        Source: {item.recordType === "loan_inquiry" ? "Loan Inquiry" : "Dashboard"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(item.kycStatus)}>{item.kycStatus}</Badge>
                    </td>
                    <td className="px-4 py-3">{item.profileCompletion ?? 0}%</td>
                    <td className="px-4 py-3">
                      {item.bankName && item.accountNumber && item.branchCode ? (
                        <Badge tone="green">Available</Badge>
                      ) : (
                        <Badge tone="amber">Missing</Badge>
                      )}
                    </td>
                    <td className="px-4 py-3">{formatDate(item.updatedAt)}</td>
                    <td className="px-4 py-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setSelectedReviewId(String(item.reviewId || item.userId));
                          setSelectedRecord(item);
                          setRemarks(item.kycRemarks || "");
                          setShowFullAccount(false);
                          setAvatarBroken(false);
                        }}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Page {pagination.page} of {pagination.totalPages} - Total {pagination.total}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={pagination.page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      {selected ? (
        <div className="rounded-xl border bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">KYC Review Decision</h2>
            <Badge tone={statusTone(selected.kycStatus)}>{selected.kycStatus}</Badge>
          </div>

          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <div className="rounded-lg border p-3 flex items-center gap-3 md:col-span-3">
              {selected.avatarUrl && !avatarBroken ? (
                <img
                  src={resolveAssetUrl(selected.avatarUrl)}
                  alt="Profile"
                  className="h-16 w-16 rounded-full object-cover border border-slate-200"
                  onError={() => setAvatarBroken(true)}
                />
              ) : (
                <div className="h-16 w-16 rounded-full border border-slate-200 bg-slate-100 flex items-center justify-center text-slate-500 text-base font-semibold">
                  {String(selected.fullName || "U").trim().charAt(0).toUpperCase() || "U"}
                </div>
              )}
              <div>
                <p className="text-xs text-slate-500">Applicant</p>
                <p className="font-semibold text-slate-900">{selected.fullName || "-"}</p>
                <p className="text-xs text-slate-500">{selected.email || "-"}</p>
                <p className="text-xs text-slate-500">{selected.phone || "-"}</p>
              </div>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-slate-500">
                {selected.recordType === "loan_inquiry" ? "Inquiry ID" : "User ID"}
              </p>
              <p className="font-semibold break-all">{String(selected.userId)}</p>
              <p className="text-xs text-slate-500 mt-1">{selected.email || "-"}</p>
              <p className="text-xs text-slate-500">{selected.phone || "-"}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-slate-500">Profile Completion</p>
              <p className="font-semibold">{selected.profileCompletion ?? 0}%</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-slate-500">Submitted</p>
              <p className="font-semibold">{formatDate(selected.submittedAt)}</p>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <p className="text-sm font-semibold">KYC Timeline</p>
            {timeline.length === 0 ? (
              <p className="mt-2 text-sm text-slate-500">No recorded timeline events yet.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <div className="flex min-w-max items-center gap-3">
                  {timeline.map((item, index) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="min-w-[190px] rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                          {item.label}
                        </p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {formatDate(item.value)}
                        </p>
                      </div>
                      {index < timeline.length - 1 ? (
                        <div className="h-px w-8 bg-slate-300" />
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-lg border p-3">
            <p className="text-sm font-semibold">Profile Details</p>
            <div className="mt-2 grid gap-3 text-sm md:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Address</p>
                <p className="font-medium text-slate-800">{selected.addressLine1 || "-"}</p>
                <p className="text-slate-700">
                  {selected.city || "-"}, {selected.district || "-"}
                </p>
                <p className="text-slate-700">{selected.country || "Malawi"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Employment</p>
                <p className="font-medium text-slate-800">{selected.employmentType || "-"}</p>
                <p className="text-slate-700">
                  Income: {selected.monthlyIncome ? `MWK ${Number(selected.monthlyIncome).toLocaleString("en-US")}` : "-"}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Loan / KYC Summary</p>
                <p className="text-slate-700">Submitted: {formatDate(selected.submittedAt)}</p>
                <p className="text-slate-700">Verified: {formatDate(selected.verifiedAt)}</p>
                <p className="text-slate-700">Rejected: {formatDate(selected.rejectedAt)}</p>
                {selected.loanProductName ? (
                  <p className="text-slate-700">Loan Type: {selected.loanProductName}</p>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <p className="text-sm font-semibold">Bank Details</p>
            <div className="mt-2 grid gap-3 text-sm md:grid-cols-3">
              <div>
                <p className="text-xs text-slate-500">Bank Name</p>
                <p className="font-medium text-slate-800">{selected.bankName || "-"}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Account Number</p>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium text-slate-800">
                    {showFullAccount ? selected.accountNumber || "-" : maskAccountNumber(selected.accountNumber)}
                  </p>
                  <button
                    type="button"
                    className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
                    onClick={() => setShowFullAccount((v) => !v)}
                  >
                    {showFullAccount ? "Hide" : "Reveal"}
                  </button>
                  <button
                    type="button"
                    className="rounded border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    disabled={!selected.accountNumber}
                    onClick={async () => {
                      try {
                        if (!selected.accountNumber) return;
                        await navigator.clipboard.writeText(String(selected.accountNumber));
                      } catch {
                        setError("Could not copy account number.");
                        toast.error("Could not copy account number.");
                      }
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500">Branch Code</p>
                <p className="font-medium text-slate-800">{selected.branchCode || "-"}</p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-semibold">Documents</p>
            {(selected.documents || []).length === 0 ? (
              <p className="text-sm text-slate-500">No documents uploaded.</p>
            ) : (
              <div className="space-y-2">
                {(selected.documents || []).map((doc, idx) => {
                  const href = doc.fileUrl
                    ? doc.fileUrl.startsWith("http")
                      ? doc.fileUrl
                      : `${fileBase}${doc.fileUrl}`
                    : "";
                  return (
                    <div key={`${doc.type}-${idx}`} className="flex flex-wrap items-center gap-2 text-sm">
                                <Badge tone="blue">{doc.type}</Badge>
                                <span className="text-slate-700">
                                  {DOC_LABEL[doc.type] || doc.type}
                                </span>
                                <span className="text-slate-600">{doc.mime || "-"}</span>
                      <span className="text-xs text-slate-500">{formatDate(doc.uploadedAt)}</span>
                      {href ? (
                        <a href={href} target="_blank" rel="noreferrer" className="text-slate-800 underline">
                          Preview
                        </a>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-semibold">Remarks</p>
            <textarea
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-400"
              rows={3}
              placeholder="Add rejection remarks (required for reject)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setSelectedReviewId("");
                setSelectedRecord(null);
                setRemarks("");
                setShowFullAccount(false);
              }}
            >
              Close
            </Button>
            <Button variant="danger" disabled={actionLoading} onClick={handleReject}>
              {actionLoading ? "Processing..." : "Reject KYC"}
            </Button>
            <Button disabled={actionLoading} onClick={handleVerify}>
              {actionLoading ? "Processing..." : "Verify KYC"}
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
