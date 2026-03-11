import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { applicationsApi } from "../services/applications.api";

const STATUS_FILTERS = [
  { label: "All", value: "ALL" },
  { label: "Pre-Application", value: "PRE_APPLICATION" },
  { label: "Submitted", value: "SUBMITTED" },
  { label: "Pending", value: "PENDING" },
  { label: "In Review", value: "UNDER_REVIEW" },
  { label: "Approved", value: "APPROVED" },
  { label: "Rejected", value: "REJECTED" },
  { label: "Disbursed", value: "DISBURSED" },
  { label: "Cancelled", value: "CANCELLED" },
];

const STATUS_LABEL = {
  PRE_APPLICATION: "Pre-Application",
  SUBMITTED: "Submitted",
  PENDING: "Pending",
  UNDER_REVIEW: "In Review",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  DISBURSED: "Disbursed",
  CANCELLED: "Cancelled",
};

const money = (value) => `MWK ${Number(value || 0).toLocaleString()}`;

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

const statusBadgeClass = (status) => {
  const base = "px-2 py-1 text-xs font-semibold rounded-full border";
  if (status === "APPROVED" || status === "DISBURSED") {
    return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  }
  if (status === "UNDER_REVIEW" || status === "PENDING") {
    return `${base} bg-amber-50 text-amber-700 border-amber-200`;
  }
  if (status === "PRE_APPLICATION" || status === "SUBMITTED") {
    return `${base} bg-blue-50 text-blue-700 border-blue-200`;
  }
  if (status === "REJECTED" || status === "CANCELLED") {
    return `${base} bg-red-50 text-red-700 border-red-200`;
  }
  return `${base} bg-slate-100 text-slate-700 border-slate-200`;
};

export default function DashboardMyApplicationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const createdId = searchParams.get("created") || "";
  const createdStatus = searchParams.get("createdStatus") || "";

  const [filters, setFilters] = useState({
    status: searchParams.get("status") || "ALL",
    q: searchParams.get("q") || "",
    sortBy: searchParams.get("sortBy") || "createdAt",
    sortOrder: searchParams.get("sortOrder") || "desc",
    page: Number(searchParams.get("page") || 1),
    limit: Number(searchParams.get("limit") || 10),
  });

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState(createdId || "");
  const [selected, setSelected] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      status: searchParams.get("status") || "ALL",
      q: searchParams.get("q") || "",
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
      page: Number(searchParams.get("page") || 1),
      limit: Number(searchParams.get("limit") || 10),
    }));
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.status && filters.status !== "ALL") params.set("status", filters.status);
    if (filters.q) params.set("q", filters.q);
    if (filters.sortBy !== "createdAt") params.set("sortBy", filters.sortBy);
    if (filters.sortOrder !== "desc") params.set("sortOrder", filters.sortOrder);
    if (filters.page > 1) params.set("page", String(filters.page));
    if (filters.limit !== 10) params.set("limit", String(filters.limit));
    if (createdId) params.set("created", createdId);
    if (createdStatus) params.set("createdStatus", createdStatus);
    setSearchParams(params, { replace: true });
  }, [filters, createdId, createdStatus, setSearchParams]);

  const fetchList = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await applicationsApi.list(filters);
      const nextItems = data?.items || [];
      const nextPagination = data?.pagination || {
        page: 1,
        limit: filters.limit,
        total: nextItems.length,
        totalPages: 1,
      };
      setItems(nextItems);
      setPagination(nextPagination);

      if (!selectedId && createdId) {
        const createdRow = nextItems.find((x) => String(x._id) === String(createdId));
        if (createdRow) setSelectedId(String(createdRow._id));
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load applications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [filters.status, filters.q, filters.sortBy, filters.sortOrder, filters.page, filters.limit]);

  const openDetails = async (id) => {
    if (!id) return;
    setSelectedId(id);
    setSelected(null);
    setDetailsLoading(true);
    setError("");
    try {
      const data = await applicationsApi.getById(id);
      setSelected(data || null);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to load application details.");
    } finally {
      setDetailsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedId) openDetails(selectedId);
  }, [selectedId]);

  const stats = useMemo(() => {
    const total = Number(pagination.total || 0);
    const inReview = items.filter((a) => a.status === "UNDER_REVIEW").length;
    const approved = items.filter((a) => a.status === "APPROVED").length;
    const rejected = items.filter((a) => a.status === "REJECTED").length;
    return { total, inReview, approved, rejected };
  }, [items, pagination.total]);

  return (
    <div className="space-y-6">
      <section className="space-y-2">
        <h1 className="text-xl font-semibold text-slate-800">My Applications</h1>
        <p className="text-sm text-slate-500">
          Track your loan applications and latest status updates.
        </p>
        {createdId ? (
          <p className="text-xs rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-700">
            {createdStatus === "PRE_APPLICATION"
              ? "Pre-application saved. Complete profile and KYC, then submit again."
              : "Application submitted successfully. Review its status below."}
          </p>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total", value: stats.total },
          { label: "In Review", value: stats.inReview },
          { label: "Approved", value: stats.approved },
          { label: "Rejected", value: stats.rejected },
        ].map((stat) => (
          <div key={stat.label} className="rounded-2xl border bg-white p-4 text-center shadow-sm">
            <p className="text-lg font-semibold text-slate-800">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => setFilters((p) => ({ ...p, status: filter.value, page: 1 }))}
              className={`px-3 py-1.5 text-sm rounded-full border transition ${
                filters.status === filter.value
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-700 hover:bg-slate-100"
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Search product/name/phone..."
            value={filters.q}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value, page: 1 }))}
            className="border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
          />
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters((p) => ({ ...p, sortBy: e.target.value }))}
            className="border rounded-xl px-3 py-2 text-sm"
          >
            <option value="createdAt">Newest first</option>
            <option value="requestedAmount">Amount</option>
            <option value="status">Status</option>
            <option value="updatedAt">Updated</option>
          </select>
        </div>
      </div>

      <div className="rounded-2xl border bg-white shadow-sm overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-4 text-left">Application ID</th>
              <th className="p-4 text-left">Product</th>
              <th className="p-4 text-left">Amount</th>
              <th className="p-4 text-left">Created</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="p-4 text-slate-500">Loading applications...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-6 text-center text-slate-500">
                  No applications yet. <Link to="/dashboard/apply-loan" className="underline">Start New Application</Link>
                </td>
              </tr>
            ) : (
              items.map((app) => {
                const isCreated = createdId && String(app._id) === String(createdId);
                return (
                  <tr
                    key={app._id}
                    className={`border-t ${isCreated ? "bg-emerald-50/50" : "hover:bg-slate-50"}`}
                  >
                    <td className="p-4 text-xs">{app._id}</td>
                    <td className="p-4">{app.productSlug || "-"}</td>
                    <td className="p-4">{money(app.requestedAmount)}</td>
                    <td className="p-4">{formatDate(app.createdAt)}</td>
                    <td className="p-4">
                      <span className={statusBadgeClass(app.status)}>
                        {STATUS_LABEL[app.status] || app.status}
                      </span>
                    </td>
                    <td className="p-4">
                      <button
                        type="button"
                        onClick={() => setSelectedId(String(app._id))}
                        className="text-slate-700 hover:underline"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Page {pagination.page} of {pagination.totalPages} - Total {pagination.total}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            disabled={pagination.page <= 1}
            className="rounded-xl border px-3 py-2 text-sm disabled:opacity-50"
            onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
          >
            Previous
          </button>
          <button
            type="button"
            disabled={pagination.page >= pagination.totalPages}
            className="rounded-xl border px-3 py-2 text-sm disabled:opacity-50"
            onClick={() =>
              setFilters((p) => ({
                ...p,
                page: Math.min(pagination.totalPages, p.page + 1),
              }))
            }
          >
            Next
          </button>
        </div>
      </div>

      {selectedId ? (
        <div className="rounded-2xl border bg-white p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-slate-900">Application Details</h2>
            <button
              type="button"
              onClick={() => {
                setSelectedId("");
                setSelected(null);
              }}
              className="rounded-xl border px-3 py-2 text-sm"
            >
              Close
            </button>
          </div>

          {detailsLoading || !selected ? (
            <p className="text-sm text-slate-500">Loading details...</p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500">Product</p>
                  <p className="font-semibold">{selected.productSlug || "-"}</p>
                  <p className="text-xs text-slate-500 mt-1">Amount</p>
                  <p>{money(selected.requestedAmount)}</p>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500">Tenure</p>
                  <p className="font-semibold">{selected.tenureMonths} months</p>
                  <p className="text-xs text-slate-500 mt-1">Status</p>
                  <span className={statusBadgeClass(selected.status)}>
                    {STATUS_LABEL[selected.status] || selected.status}
                  </span>
                </div>
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500">Created</p>
                  <p className="font-semibold">{formatDate(selected.createdAt)}</p>
                  <p className="text-xs text-slate-500 mt-1">Updated</p>
                  <p>{formatDate(selected.updatedAt)}</p>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <h3 className="text-sm font-semibold mb-2">Status Timeline</h3>
                {(selected.statusHistory || []).length === 0 ? (
                  <p className="text-sm text-slate-500">No status timeline yet.</p>
                ) : (
                  <div className="space-y-2">
                    {(selected.statusHistory || [])
                      .slice()
                      .reverse()
                      .map((row, idx) => (
                        <div key={`${row.updatedAt}-${idx}`} className="text-sm rounded-lg border p-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={statusBadgeClass(row.status)}>
                              {STATUS_LABEL[row.status] || row.status}
                            </span>
                            <span className="text-xs text-slate-500">{formatDate(row.updatedAt)}</span>
                          </div>
                          <p className="mt-1 text-slate-700">{row.note || "-"}</p>
                          <p className="text-xs text-slate-500">
                            {row.reasonCode ? `Reason: ${row.reasonCode}` : "Reason: -"}
                          </p>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
