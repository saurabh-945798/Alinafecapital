import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { loanApplicationsApi } from "../../services/api/loanApplications.api";
import { useToast } from "../../context/ToastContext.jsx";

const STATUS_OPTIONS = [
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "DISBURSED",
  "CANCELLED",
];

const STATUS_TRANSITIONS = {
  PENDING: ["UNDER_REVIEW", "REJECTED", "CANCELLED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["DISBURSED", "CANCELLED"],
  REJECTED: [],
  DISBURSED: [],
  CANCELLED: [],
};

const STATUS_TONE = {
  PENDING: "amber",
  UNDER_REVIEW: "blue",
  APPROVED: "green",
  REJECTED: "red",
  DISBURSED: "green",
  CANCELLED: "gray",
};

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

const money = (value) => {
  const n = Number(value || 0);
  return `MWK ${n.toLocaleString()}`;
};

const getItemId = (item) => item?._id || item?.id || "";

export default function LoanApplication() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [filters, setFilters] = useState({
    status: searchParams.get("status") || "",
    q: searchParams.get("q") || "",
    sortBy: searchParams.get("sortBy") || "createdAt",
    sortOrder: searchParams.get("sortOrder") || "desc",
    page: Number(searchParams.get("page") || 1),
    limit: Number(searchParams.get("limit") || 20),
    from: searchParams.get("from") || "",
    to: searchParams.get("to") || "",
  });

  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [decision, setDecision] = useState({
    status: "",
    note: "",
    reasonCode: "",
    disbursementReference: "",
    disbursedAmount: "",
    disbursedAt: "",
  });
  const [decisionLoading, setDecisionLoading] = useState(false);

  const selectedStatus = selected?.status || "";
  const allowedNextStatuses = useMemo(
    () => STATUS_TRANSITIONS[selectedStatus] || [],
    [selectedStatus]
  );

  const fetchList = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await loanApplicationsApi.list(filters);
      setItems(res?.items || []);
      setPagination(
        res?.pagination || {
          page: 1,
          limit: filters.limit,
          total: 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load applications.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [
    filters.page,
    filters.limit,
    filters.status,
    filters.q,
    filters.sortBy,
    filters.sortOrder,
    filters.from,
    filters.to,
  ]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      status: searchParams.get("status") || "",
      q: searchParams.get("q") || "",
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
      page: Number(searchParams.get("page") || 1),
      limit: Number(searchParams.get("limit") || 20),
      from: searchParams.get("from") || "",
      to: searchParams.get("to") || "",
    }));
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status) params.set("status", filters.status);
    if (filters.q) params.set("q", filters.q);
    if (filters.sortBy && filters.sortBy !== "createdAt") params.set("sortBy", filters.sortBy);
    if (filters.sortOrder && filters.sortOrder !== "desc") params.set("sortOrder", filters.sortOrder);
    if (filters.page > 1) params.set("page", String(filters.page));
    if (filters.limit !== 20) params.set("limit", String(filters.limit));
    if (filters.from) params.set("from", filters.from);
    if (filters.to) params.set("to", filters.to);
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const openDetails = async (id) => {
    if (!id) return;
    setSelectedId(id);
    setSelected(null);
    setDecision({
      status: "",
      note: "",
      reasonCode: "",
      disbursementReference: "",
      disbursedAmount: "",
      disbursedAt: "",
    });
    setSelectedLoading(true);
    try {
      const doc = await loanApplicationsApi.getById(id);
      setSelected(doc);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load application details.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSelectedLoading(false);
    }
  };

  const closeDetails = () => {
    setSelectedId("");
    setSelected(null);
    setDecision({
      status: "",
      note: "",
      reasonCode: "",
      disbursementReference: "",
      disbursedAmount: "",
      disbursedAt: "",
    });
  };

  const submitDecision = async () => {
    if (!selectedId || !decision.status) return;
    setDecisionLoading(true);
    setError("");
    try {
      const payload = {
        status: decision.status,
        note: decision.note.trim(),
        reasonCode: decision.reasonCode.trim().toUpperCase(),
      };
      if (decision.status === "DISBURSED") {
        payload.disbursementReference = decision.disbursementReference.trim();
        payload.disbursedAmount = Number(decision.disbursedAmount);
        payload.disbursedAt = decision.disbursedAt
          ? new Date(decision.disbursedAt).toISOString()
          : undefined;
      }
      await loanApplicationsApi.updateStatus(selectedId, payload);
      await openDetails(selectedId);
      await fetchList();
      toast.success("Application status updated successfully.");
      setDecision((prev) => ({
        ...prev,
        note: "",
        reasonCode: "",
        disbursementReference: "",
        disbursedAmount: "",
        disbursedAt: "",
      }));
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to update status.";
      setError(msg);
      toast.error(msg);
    } finally {
      setDecisionLoading(false);
    }
  };

  const canSubmitDecision = useMemo(() => {
    if (!decision.status) return false;
    if (!allowedNextStatuses.includes(decision.status)) return false;
    if (decision.status === selectedStatus) return false;
    if (
      (decision.status === "REJECTED" || decision.status === "CANCELLED") &&
      !decision.reasonCode.trim()
    ) {
      return false;
    }
    if (decision.status === "DISBURSED") {
      if (!decision.disbursementReference.trim()) return false;
      if (!Number.isFinite(Number(decision.disbursedAmount)) || Number(decision.disbursedAmount) <= 0) {
        return false;
      }
      if (Number(decision.disbursedAmount) > Number(selected?.requestedAmount || 0)) {
        return false;
      }
      if (!decision.disbursedAt) return false;
    }
    return true;
  }, [
    decision.status,
    decision.reasonCode,
    decision.disbursementReference,
    decision.disbursedAmount,
    decision.disbursedAt,
    allowedNextStatuses,
    selectedStatus,
  ]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Loan Applications</h1>
          <p className="text-sm text-slate-500">
            Review, approve, reject and track all incoming applications.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-7">
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="Search name / phone / email / product"
            value={filters.q}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value, page: 1 }))}
          />

          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={filters.status}
            onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value, page: 1 }))}
          >
            <option value="">All Status</option>
            {STATUS_OPTIONS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={filters.sortBy}
            onChange={(e) => setFilters((p) => ({ ...p, sortBy: e.target.value }))}
          >
            <option value="createdAt">Sort: Created</option>
            <option value="requestedAmount">Sort: Amount</option>
            <option value="status">Sort: Status</option>
            <option value="updatedAt">Sort: Updated</option>
          </select>

          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={filters.sortOrder}
            onChange={(e) => setFilters((p) => ({ ...p, sortOrder: e.target.value }))}
          >
            <option value="desc">Desc</option>
            <option value="asc">Asc</option>
          </select>

          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            type="date"
            value={filters.from}
            onChange={(e) => setFilters((p) => ({ ...p, from: e.target.value, page: 1 }))}
          />

          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            type="date"
            value={filters.to}
            onChange={(e) => setFilters((p) => ({ ...p, to: e.target.value, page: 1 }))}
          />

          <Button
            variant="outline"
            onClick={() =>
              setFilters({
                status: "",
                q: "",
                sortBy: "createdAt",
                sortOrder: "desc",
                page: 1,
                limit: 20,
                from: "",
                to: "",
              })
            }
          >
            Reset Filters
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Applicant</th>
                <th className="px-4 py-3 text-left">Product</th>
                <th className="px-4 py-3 text-left">Amount</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">SLA</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={7}>
                    Loading applications...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={7}>
                    No applications found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={getItemId(item)} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{item.fullName}</p>
                      <p className="text-xs text-slate-500">{item.phone}</p>
                    </td>
                    <td className="px-4 py-3">{item.productSlug}</td>
                    <td className="px-4 py-3">{money(item.requestedAmount)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[item.status] || "gray"}>{item.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs">
                        <p>{item?.sla?.ageBucket || "-"}</p>
                        <p className={item?.sla?.slaBreached ? "text-rose-600" : "text-slate-500"}>
                          {item?.sla?.slaBreached ? "Breached" : "On time"}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openDetails(getItemId(item))}
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
            variant="outline"
            size="sm"
            disabled={pagination.page <= 1}
            onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() =>
              setFilters((p) => ({ ...p, page: Math.min(pagination.totalPages, p.page + 1) }))
            }
          >
            Next
          </Button>
        </div>
      </div>

      {selectedId ? (
        <div className="rounded-xl border bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Application Review</h2>
            <Button variant="outline" size="sm" onClick={closeDetails}>
              Close
            </Button>
          </div>

          {selectedLoading || !selected ? (
            <p className="text-sm text-slate-500">Loading application details...</p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500">Applicant</p>
                  <p className="font-semibold">{selected.fullName}</p>
                  <p>{selected.phone}</p>
                  <p>{selected.email || "-"}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500">Loan</p>
                  <p className="font-semibold">{selected.productSlug}</p>
                  <p>{money(selected.requestedAmount)}</p>
                  <p>{selected.tenureMonths} months</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500">Current Status</p>
                  <div className="mt-1">
                    <Badge tone={STATUS_TONE[selected.status] || "gray"}>
                      {selected.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    Created: {formatDate(selected.createdAt)}
                  </p>
                </div>
              </div>

              <div className="rounded-lg border p-3 space-y-3">
                <h3 className="text-sm font-semibold">Decision</h3>
                <div className="grid gap-3 md:grid-cols-3">
                  <select
                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                    value={decision.status}
                    onChange={(e) =>
                      setDecision((p) => ({ ...p, status: e.target.value }))
                    }
                  >
                    <option value="">
                      {allowedNextStatuses.length
                        ? "Select next status"
                        : "No transition available"}
                    </option>
                    {allowedNextStatuses.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>

                  <input
                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                    placeholder="Reason code (required for REJECTED/CANCELLED)"
                    value={decision.reasonCode}
                    onChange={(e) =>
                      setDecision((p) => ({ ...p, reasonCode: e.target.value }))
                    }
                  />

                  <input
                    className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                    placeholder="Optional note"
                    value={decision.note}
                    onChange={(e) =>
                      setDecision((p) => ({ ...p, note: e.target.value }))
                    }
                  />
                </div>
                {!allowedNextStatuses.length ? (
                  <p className="text-xs text-slate-500">
                    No further transition is allowed from current status ({selectedStatus || "-"}).
                  </p>
                ) : null}
                {decision.status === "DISBURSED" ? (
                  <div className="grid gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 md:grid-cols-3">
                    <input
                      className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                      placeholder="Transfer reference (required)"
                      value={decision.disbursementReference}
                      onChange={(e) =>
                        setDecision((p) => ({ ...p, disbursementReference: e.target.value }))
                      }
                    />
                    <input
                      className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                      type="number"
                      min="0"
                      max={Number(selected?.requestedAmount || 0)}
                      placeholder="Disbursed amount (MWK)"
                      value={decision.disbursedAmount}
                      onChange={(e) =>
                        setDecision((p) => ({ ...p, disbursedAmount: e.target.value }))
                      }
                    />
                    <input
                      className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
                      type="datetime-local"
                      value={decision.disbursedAt}
                      onChange={(e) =>
                        setDecision((p) => ({ ...p, disbursedAt: e.target.value }))
                      }
                    />
                    {Number(decision.disbursedAmount || 0) > Number(selected?.requestedAmount || 0) ? (
                      <p className="text-xs text-rose-700 md:col-span-3">
                        Disbursed amount cannot exceed requested amount ({money(selected?.requestedAmount)}).
                      </p>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex justify-end">
                  <Button
                    disabled={!canSubmitDecision || decisionLoading}
                    onClick={submitDecision}
                  >
                    {decisionLoading ? "Updating..." : "Update Status"}
                  </Button>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <h3 className="text-sm font-semibold mb-2">Status History</h3>
                <div className="space-y-2">
                  {(selected.statusHistory || []).length === 0 ? (
                    <p className="text-sm text-slate-500">No status history.</p>
                  ) : (
                    (selected.statusHistory || []).slice().reverse().map((row, idx) => (
                      <div key={`${row.updatedAt}-${idx}`} className="flex flex-wrap items-center gap-2 text-sm">
                        <Badge tone={STATUS_TONE[row.status] || "gray"}>{row.status}</Badge>
                        <span className="text-slate-600">{row.note || "-"}</span>
                        <span className="text-xs text-slate-500">
                          {row.reasonCode ? `(${row.reasonCode})` : ""}
                        </span>
                        <span className="text-xs text-slate-500">{formatDate(row.updatedAt)}</span>
                        <span className="text-xs text-slate-500">{row.updatedBy || "-"}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selected.disbursement?.reference ? (
                <div className="rounded-lg border p-3">
                  <h3 className="text-sm font-semibold mb-2">Disbursement Details</h3>
                  <div className="grid gap-3 text-sm md:grid-cols-3">
                    <div>
                      <p className="text-xs text-slate-500">Reference</p>
                      <p className="font-semibold text-slate-900">{selected.disbursement.reference}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Amount</p>
                      <p className="font-semibold text-slate-900">{money(selected.disbursement.amount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Disbursed At</p>
                      <p className="font-semibold text-slate-900">{formatDate(selected.disbursement.disbursedAt)}</p>
                    </div>
                    <div className="md:col-span-3">
                      <p className="text-xs text-slate-500">Note</p>
                      <p className="text-slate-700">{selected.disbursement.note || "-"}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
