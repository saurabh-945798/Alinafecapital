import { useEffect, useState } from "react";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { inquiriesApi } from "../../services/api/inquiries.api";
import { useToast } from "../../context/ToastContext.jsx";

const STATUS_TONE = {
  NEW: "amber",
  CONTACTED: "blue",
  QUALIFIED: "green",
  CLOSED: "gray",
};

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
};

export default function InquiriesPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("ALL");
  const [actionLoadingId, setActionLoadingId] = useState("");
  const [selected, setSelected] = useState(null);
  const [adminNote, setAdminNote] = useState("");

  const fetchList = async (page = pagination.page) => {
    setLoading(true);
    setError("");
    try {
      const data = await inquiriesApi.list({ page, limit: 20, q, status });
      setItems(data?.items || []);
      setPagination(data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load inquiries.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList(1);
  }, [q, status]);

  const updateInquiry = async (id, payload) => {
    setActionLoadingId(id);
    try {
      const updated = await inquiriesApi.update(id, payload);
      setItems((prev) => prev.map((x) => (x._id === id ? updated : x)));
      if (selected?._id === id) {
        setSelected(updated);
        setAdminNote(updated.adminNote || "");
      }
      toast.success("Inquiry updated.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update inquiry.");
    } finally {
      setActionLoadingId("");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Loan Inquiries</h1>
        <p className="text-sm text-slate-500">Review inquiry submissions from public website Apply Loan form.</p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-3">
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="Search name / phone / email / product"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="ALL">All Status</option>
            <option value="NEW">NEW</option>
            <option value="CONTACTED">CONTACTED</option>
            <option value="QUALIFIED">QUALIFIED</option>
            <option value="CLOSED">CLOSED</option>
          </select>
          <Button variant="outline" onClick={() => fetchList(1)}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="rounded-xl border bg-white overflow-hidden">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Loan</th>
                <th className="px-4 py-3 text-left">Requested</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Created</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>
                    Loading inquiries...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={6}>
                    No inquiries found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900">{item.fullName}</p>
                      <p className="text-xs text-slate-500">{item.phone}</p>
                      <p className="text-xs text-slate-500">{item.email || "-"}</p>
                      <p className="text-xs text-slate-500">{item.address || "-"}</p>
                    </td>
                    <td className="px-4 py-3">{item.loanProductSlug}</td>
                    <td className="px-4 py-3">
                      <p>MWK {Number(item.requestedAmount || 0).toLocaleString("en-US")}</p>
                      <p className="text-xs text-slate-500">{item.preferredTenureMonths || "-"} months</p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[item.status] || "gray"}>{item.status}</Badge>
                    </td>
                    <td className="px-4 py-3">{formatDate(item.createdAt)}</td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setSelected(item);
                          setAdminNote(item.adminNote || "");
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
            onClick={() => fetchList(Math.max(1, pagination.page - 1))}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchList(Math.min(pagination.totalPages, pagination.page + 1))}
          >
            Next
          </Button>
        </div>
      </div>

      {selected ? (
        <div className="rounded-xl border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Inquiry Review</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelected(null);
                setAdminNote("");
              }}
            >
              Close
            </Button>
          </div>

          <div className="grid gap-3 md:grid-cols-3 text-sm">
            <div className="rounded-lg border p-3">
              <p className="text-xs text-slate-500">Customer</p>
              <p className="font-semibold">{selected.fullName}</p>
              <p>{selected.phone}</p>
              <p>{selected.email || "-"}</p>
              <p>{selected.address || "-"}</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-slate-500">Loan</p>
              <p className="font-semibold">{selected.loanProductSlug}</p>
              <p>Requested: MWK {Number(selected.requestedAmount || 0).toLocaleString("en-US")}</p>
              <p>Tenure: {selected.preferredTenureMonths || "-"} months</p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-xs text-slate-500">Status</p>
              <Badge tone={STATUS_TONE[selected.status] || "gray"}>{selected.status}</Badge>
              <p className="mt-2 text-xs text-slate-500">Created: {formatDate(selected.createdAt)}</p>
            </div>
          </div>

          <div className="rounded-lg border p-3">
            <p className="text-sm font-semibold">Customer Note</p>
            <p className="mt-2 text-sm text-slate-700">{selected.notes || "-"}</p>
          </div>

          <div className="rounded-lg border p-3 space-y-2">
            <p className="text-sm font-semibold">Admin Note</p>
            <textarea
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              placeholder="Add follow-up notes"
            />
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            {["NEW", "CONTACTED", "QUALIFIED", "CLOSED"].map((nextStatus) => (
              <Button
                key={nextStatus}
                size="sm"
                variant={selected.status === nextStatus ? "secondary" : "outline"}
                disabled={actionLoadingId === selected._id}
                onClick={() =>
                  updateInquiry(selected._id, { status: nextStatus, adminNote })
                }
              >
                {nextStatus}
              </Button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
