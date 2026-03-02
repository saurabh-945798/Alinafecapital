import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Badge from "../ui/Badge";
import { loanApplicationsApi } from "../../services/api/loanApplications.api";
import { complianceApi } from "../../services/api/compliance.api";
import { useToast } from "../../context/ToastContext.jsx";

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleString();
};

const money = (value) => `MWK ${Number(value || 0).toLocaleString()}`;

const getTotal = (res) => Number(res?.pagination?.total || 0);

export default function Dashboard() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState({
    pendingApplications: 0,
    underReviewApplications: 0,
    approvedThisWeek: 0,
    pendingKyc: 0,
  });
  const [oldestPending, setOldestPending] = useState([]);
  const [recentDecisions, setRecentDecisions] = useState([]);

  const thisWeekFrom = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError("");
    try {
      const [
        pendingRes,
        reviewRes,
        approvedWeekRes,
        pendingKycRes,
        oldestPendingRes,
        recentDecisionRes,
      ] = await Promise.all([
        loanApplicationsApi.list({ status: "PENDING", page: 1, limit: 1 }),
        loanApplicationsApi.list({ status: "UNDER_REVIEW", page: 1, limit: 1 }),
        loanApplicationsApi.list({
          status: "APPROVED",
          page: 1,
          limit: 1,
          from: thisWeekFrom,
        }),
        complianceApi.listKyc({ status: "pending" }),
        loanApplicationsApi.list({
          status: "PENDING",
          page: 1,
          limit: 5,
          sortBy: "createdAt",
          sortOrder: "asc",
        }),
        loanApplicationsApi.list({
          status: "APPROVED,REJECTED,DISBURSED,CANCELLED",
          page: 1,
          limit: 6,
          sortBy: "updatedAt",
          sortOrder: "desc",
        }),
      ]);

      setMetrics({
        pendingApplications: getTotal(pendingRes),
        underReviewApplications: getTotal(reviewRes),
        approvedThisWeek: getTotal(approvedWeekRes),
        pendingKyc: Number(
          pendingKycRes?.pagination?.total ??
            (Array.isArray(pendingKycRes?.items) ? pendingKycRes.items.length : 0)
        ),
      });

      setOldestPending(oldestPendingRes?.items || []);
      setRecentDecisions(recentDecisionRes?.items || []);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load dashboard metrics.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Operations overview for applications and KYC queues.
          </p>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Pending Applications"
          value={metrics.pendingApplications}
          to="/admin/applications?status=PENDING&page=1"
        />
        <MetricCard
          label="Under Review"
          value={metrics.underReviewApplications}
          to="/admin/applications?status=UNDER_REVIEW&page=1"
        />
        <MetricCard
          label="Approved (7 days)"
          value={metrics.approvedThisWeek}
          to={`/admin/applications?status=APPROVED&from=${thisWeekFrom}&page=1`}
        />
        <MetricCard
          label="Pending KYC"
          value={metrics.pendingKyc}
          to="/admin/compliance"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Oldest Pending Applications</h2>
            <Link to="/admin/applications" className="text-sm text-slate-700 underline">
              Open queue
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : oldestPending.length === 0 ? (
            <p className="text-sm text-slate-500">No pending applications.</p>
          ) : (
            <div className="space-y-2">
              {oldestPending.map((item) => (
                <div
                  key={item._id || item.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="font-semibold">{item.fullName}</span>
                  <Badge tone="amber">PENDING</Badge>
                  <span>{item.productSlug}</span>
                  <span>{money(item.requestedAmount)}</span>
                  <span className="text-xs text-slate-500">{formatDate(item.createdAt)}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border bg-white p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent Decisions</h2>
            <Link to="/admin/applications" className="text-sm text-slate-700 underline">
              View all
            </Link>
          </div>

          {loading ? (
            <p className="text-sm text-slate-500">Loading...</p>
          ) : recentDecisions.length === 0 ? (
            <p className="text-sm text-slate-500">No recent decisions.</p>
          ) : (
            <div className="space-y-2">
              {recentDecisions.map((item) => (
                <div
                  key={item._id || item.id}
                  className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-2 text-sm"
                >
                  <span className="font-semibold">{item.fullName}</span>
                  <Badge
                    tone={
                      item.status === "APPROVED" || item.status === "DISBURSED"
                        ? "green"
                        : item.status === "REJECTED" || item.status === "CANCELLED"
                        ? "red"
                        : "blue"
                    }
                  >
                    {item.status}
                  </Badge>
                  <span>{item.productSlug}</span>
                  <span className="text-xs text-slate-500">{formatDate(item.updatedAt)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-lg font-semibold mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-2">
          <Link to="/admin/applications" className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">
            Review Applications
          </Link>
          <Link to="/admin/compliance" className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">
            Review KYC Queue
          </Link>
          <Link to="/admin/customers" className="rounded-lg border px-3 py-2 text-sm hover:bg-slate-50">
            Customer Profiles
          </Link>
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value, to }) {
  const content = (
    <section className="rounded-xl border bg-white p-4">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </section>
  );

  if (!to) return content;

  return (
    <Link to={to} className="block rounded-xl transition hover:-translate-y-0.5">
      {content}
    </Link>
  );
}
