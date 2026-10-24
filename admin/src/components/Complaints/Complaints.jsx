import { useEffect, useState } from "react";
import { MessageSquareWarning } from "lucide-react";
import { complaintsApi } from "../../services/api/complaints.api";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { useToast } from "../../context/ToastContext.jsx";

const STATUS_TONE = {
  NEW: "amber",
  IN_REVIEW: "blue",
  RESOLVED: "green",
  CLOSED: "gray",
};

const STATUS_LABEL = {
  NEW: "New",
  IN_REVIEW: "In Review",
  RESOLVED: "Resolved",
  CLOSED: "Closed",
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
};

export default function ComplaintsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("ALL");
  const [q, setQ] = useState("");
  const [actionLoading, setActionLoading] = useState("");

  const loadComplaints = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await complaintsApi.list({ status, q, limit: 100 });
      setItems(Array.isArray(data?.items) ? data.items : []);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load complaints.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
  }, [status, q]);

  const updateStatus = async (id, nextStatus) => {
    setActionLoading(`${id}:${nextStatus}`);
    try {
      const updated = await complaintsApi.update(id, { status: nextStatus });
      setItems((prev) => prev.map((item) => (item._id === id ? updated : item)));
      toast.success("Complaint updated.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update complaint.");
    } finally {
      setActionLoading("");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Complaints</h1>
        <p className="text-sm text-slate-500">
          Review customer complaints submitted from the public complaints form.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border bg-white p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {["ALL", "NEW", "IN_REVIEW", "RESOLVED", "CLOSED"].map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setStatus(key)}
              className={[
                "rounded-full border px-4 py-2 text-sm font-semibold transition",
                status === key
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              {STATUS_LABEL[key] || "All"}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="Search complaint code / name / phone / subject"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button variant="outline" onClick={loadComplaints}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {loading ? (
          <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">
            Loading complaints...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">
            No complaints found.
          </div>
        ) : (
          items.map((item) => (
            <article key={item._id} className="rounded-2xl border bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <MessageSquareWarning className="h-4 w-4 text-slate-500" />
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                      {item.complaintCode || "-"}
                    </p>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900">{item.fullName}</h3>
                  <p className="text-sm text-slate-500">{item.phone}</p>
                  <p className="text-sm text-slate-500">{item.email || "No email provided"}</p>
                </div>
                <Badge tone={STATUS_TONE[item.status] || "gray"}>
                  {STATUS_LABEL[item.status] || item.status}
                </Badge>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Subject
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{item.subject}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Preferred Contact
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900 capitalize">
                    {String(item.preferredContact || "-").replace(/_/g, " ")}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Complaint Details
                </p>
                <p className="mt-1 text-sm leading-7 text-slate-700">{item.message || "-"}</p>
              </div>

              {item.adminNote ? (
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Admin Note
                  </p>
                  <p className="mt-1 text-sm text-slate-700">{item.adminNote}</p>
                </div>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs text-slate-500">Submitted: {formatDate(item.createdAt)}</p>
                <div className="flex flex-wrap gap-2">
                  {item.status !== "IN_REVIEW" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading === `${item._id}:IN_REVIEW`}
                      onClick={() => updateStatus(item._id, "IN_REVIEW")}
                    >
                      In Review
                    </Button>
                  ) : null}
                  {item.status !== "RESOLVED" ? (
                    <Button
                      size="sm"
                      disabled={actionLoading === `${item._id}:RESOLVED`}
                      onClick={() => updateStatus(item._id, "RESOLVED")}
                    >
                      Resolve
                    </Button>
                  ) : null}
                  {item.status !== "CLOSED" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={actionLoading === `${item._id}:CLOSED`}
                      onClick={() => updateStatus(item._id, "CLOSED")}
                    >
                      Close
                    </Button>
                  ) : null}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
