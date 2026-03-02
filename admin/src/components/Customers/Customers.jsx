import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { customersApi } from "../../services/api/customers.api";
import { useToast } from "../../context/ToastContext.jsx";

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
};

export default function CustomersPage() {
  const toast = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    q: searchParams.get("q") || "",
    kycStatus: searchParams.get("kycStatus") || "",
    isActive: searchParams.get("isActive") || "",
    page: Number(searchParams.get("page") || 1),
    limit: Number(searchParams.get("limit") || 20),
    sortBy: searchParams.get("sortBy") || "createdAt",
    sortOrder: searchParams.get("sortOrder") || "desc",
  });

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState(null);
  const [selectedLoading, setSelectedLoading] = useState(false);

  const fetchList = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await customersApi.list(filters);
      setItems(res?.items || []);
      setPagination(
        res?.pagination || {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 1,
        }
      );
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load customers.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [
    filters.q,
    filters.kycStatus,
    filters.isActive,
    filters.page,
    filters.limit,
    filters.sortBy,
    filters.sortOrder,
  ]);

  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      q: searchParams.get("q") || "",
      kycStatus: searchParams.get("kycStatus") || "",
      isActive: searchParams.get("isActive") || "",
      page: Number(searchParams.get("page") || 1),
      limit: Number(searchParams.get("limit") || 20),
      sortBy: searchParams.get("sortBy") || "createdAt",
      sortOrder: searchParams.get("sortOrder") || "desc",
    }));
  }, [searchParams]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.kycStatus) params.set("kycStatus", filters.kycStatus);
    if (filters.isActive) params.set("isActive", filters.isActive);
    if (filters.page > 1) params.set("page", String(filters.page));
    if (filters.limit !== 20) params.set("limit", String(filters.limit));
    if (filters.sortBy !== "createdAt") params.set("sortBy", filters.sortBy);
    if (filters.sortOrder !== "desc") params.set("sortOrder", filters.sortOrder);
    setSearchParams(params, { replace: true });
  }, [filters, setSearchParams]);

  const openDetails = async (id) => {
    setSelectedId(id);
    setSelected(null);
    setSelectedLoading(true);
    setError("");
    try {
      const doc = await customersApi.getById(id);
      setSelected(doc);
      toast.success("Customer details loaded.");
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load customer details.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSelectedLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Customers</h1>
        <p className="text-sm text-slate-500">
          View customer profile, KYC state and linked application activity.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-6">
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm md:col-span-2"
            placeholder="Search name / phone / email"
            value={filters.q}
            onChange={(e) => setFilters((p) => ({ ...p, q: e.target.value, page: 1 }))}
          />

          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={filters.kycStatus}
            onChange={(e) =>
              setFilters((p) => ({ ...p, kycStatus: e.target.value, page: 1 }))
            }
          >
            <option value="">All KYC</option>
            <option value="not_started">not_started</option>
            <option value="pending">pending</option>
            <option value="verified">verified</option>
            <option value="rejected">rejected</option>
          </select>

          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={filters.isActive}
            onChange={(e) =>
              setFilters((p) => ({ ...p, isActive: e.target.value, page: 1 }))
            }
          >
            <option value="">All State</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>

          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={filters.sortBy}
            onChange={(e) => setFilters((p) => ({ ...p, sortBy: e.target.value }))}
          >
            <option value="createdAt">Sort: Created</option>
            <option value="fullName">Sort: Name</option>
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
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">KYC</th>
                <th className="px-4 py-3 text-left">Profile %</th>
                <th className="px-4 py-3 text-left">Applications</th>
                <th className="px-4 py-3 text-left">State</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>
                    Loading customers...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>
                    No customers found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{item.fullName}</p>
                      <p className="text-xs text-slate-500">{item.phone}</p>
                      <p className="text-xs text-slate-500">{item.email || "-"}</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          item.profile?.kycStatus === "verified"
                            ? "green"
                            : item.profile?.kycStatus === "rejected"
                            ? "red"
                            : item.profile?.kycStatus === "pending"
                            ? "amber"
                            : "gray"
                        }
                      >
                        {item.profile?.kycStatus || "not_started"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">{item.profile?.profileCompletion ?? 0}%</td>
                    <td className="px-4 py-3">{item.stats?.totalApplications ?? 0}</td>
                    <td className="px-4 py-3">
                      <Badge tone={item.isActive ? "green" : "gray"}>
                        {item.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => openDetails(item.id)}>
                        View
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
            onClick={() => setFilters((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
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
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Customer Details</h2>
            <Button size="sm" variant="outline" onClick={() => setSelectedId("")}>
              Close
            </Button>
          </div>

          {selectedLoading || !selected ? (
            <p className="text-sm text-slate-500">Loading customer details...</p>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-3 text-sm">
                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500">Identity</p>
                  <p className="font-semibold">{selected.fullName}</p>
                  <p>{selected.phone}</p>
                  <p>{selected.email || "-"}</p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500">KYC & Profile</p>
                  <p>KYC: {selected.profile?.kycStatus || "not_started"}</p>
                  <p>Profile: {selected.profile?.profileCompletion ?? 0}%</p>
                  <p>Updated: {formatDate(selected.profile?.updatedAt)}</p>
                </div>

                <div className="rounded-lg border p-3">
                  <p className="text-xs text-slate-500">Account</p>
                  <p>Status: {selected.isActive ? "Active" : "Inactive"}</p>
                  <p>Role: {selected.role}</p>
                  <p>Created: {formatDate(selected.createdAt)}</p>
                </div>
              </div>

              <div className="rounded-lg border p-3">
                <h3 className="text-sm font-semibold mb-2">Recent Applications</h3>
                {selected.recentApplications?.length ? (
                  <div className="space-y-2">
                    {selected.recentApplications.map((a) => (
                      <div
                        key={`${a._id}-${a.createdAt}`}
                        className="flex flex-wrap items-center gap-2 text-sm"
                      >
                        <Badge tone="blue">{a.productSlug}</Badge>
                        <Badge
                          tone={
                            a.status === "APPROVED" || a.status === "DISBURSED"
                              ? "green"
                              : a.status === "REJECTED"
                              ? "red"
                              : "amber"
                          }
                        >
                          {a.status}
                        </Badge>
                        <span>{`MWK ${Number(a.requestedAmount || 0).toLocaleString()}`}</span>
                        <span className="text-xs text-slate-500">{formatDate(a.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No recent applications.</p>
                )}
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
