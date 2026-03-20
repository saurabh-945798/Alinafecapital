import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  CheckCircle2,
  Clock3,
  FileText,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  XCircle,
} from "lucide-react";
import Badge from "../ui/Badge";
import { dashboardApi } from "../../services/api/dashboard.api";
import { useToast } from "../../context/ToastContext.jsx";

const STATUS_TONE = {
  NEW: "amber",
  CONTACTED: "blue",
  KYC_SENT: "blue",
  KYC_REJECTED: "red",
  APPROVED: "green",
  CLOSED: "gray",
};

const KYC_TONE = {
  not_started: "gray",
  pending: "amber",
  verified: "green",
  rejected: "red",
};

const HUMAN_STATUS = {
  NEW: "New",
  CONTACTED: "Pending",
  KYC_SENT: "Needs KYC",
  KYC_REJECTED: "Rejected",
  APPROVED: "Approved",
  CLOSED: "Closed",
};

const HUMAN_KYC = {
  not_started: "Not Started",
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
};

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
};

export default function Dashboard() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [metrics, setMetrics] = useState({
    newRequests: 0,
    pendingFollowUp: 0,
    needsKyc: 0,
    rejected: 0,
    approved: 0,
    closed: 0,
    actionRequired: 0,
  });
  const [needsAction, setNeedsAction] = useState([]);
  const [recentApproved, setRecentApproved] = useState([]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const fetchDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const summary = await dashboardApi.getSummary();
      setMetrics(summary?.metrics || {
        newRequests: 0,
        pendingFollowUp: 0,
        needsKyc: 0,
        rejected: 0,
        approved: 0,
        closed: 0,
        actionRequired: 0,
      });
      setNeedsAction(summary?.needsAction || []);
      setRecentApproved(summary?.recentApproved || []);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load dashboard.";
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
    <div className="space-y-6">
      <section className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-500">{greeting}</p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950">
              Dashboard Overview
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              View the full loan request queue, see what needs attention, and track approvals from one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              to="/admin/applications"
              className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Open Applications
              <ArrowRight size={16} />
            </Link>
            <button
              type="button"
              onClick={fetchDashboard}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Queue Status</h2>
            <p className="text-sm text-slate-500">
              Simple overview of the current application pipeline.
            </p>
          </div>
          <div className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Action Required: {metrics.actionRequired}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-6">
          <OverviewCard
            icon={FileText}
            label="New"
            value={metrics.newRequests}
            accent="amber"
            to="/admin/applications"
          />
          <OverviewCard
            icon={Clock3}
            label="Pending"
            value={metrics.pendingFollowUp}
            accent="blue"
            to="/admin/applications"
          />
          <OverviewCard
            icon={ShieldAlert}
            label="Needs KYC"
            value={metrics.needsKyc}
            accent="indigo"
            to="/admin/applications"
          />
          <OverviewCard
            icon={XCircle}
            label="Rejected"
            value={metrics.rejected}
            accent="rose"
            to="/admin/applications"
          />
          <OverviewCard
            icon={CheckCircle2}
            label="Approved"
            value={metrics.approved}
            accent="green"
            to="/admin/applications"
          />
          <OverviewCard
            icon={UserCheck}
            label="Closed"
            value={metrics.closed}
            accent="gray"
            to="/admin/applications"
          />
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.18fr_0.82fr]">
        <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Pending Work</h2>
              <p className="text-sm text-slate-500">
                Customers that should be handled first.
              </p>
            </div>
            <Link
              to="/admin/applications"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              View queue
              <ArrowRight size={16} />
            </Link>
          </div>

          {loading ? (
            <EmptyState label="Loading pending work..." />
          ) : needsAction.length === 0 ? (
            <EmptyState label="No requests currently need action." />
          ) : (
            <div className="space-y-3">
              {needsAction.map((item) => (
                <Link
                  key={item._id}
                  to={`/admin/applications/${item._id}`}
                  className="block rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-slate-900 transition hover:border-slate-300 hover:bg-white"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-base font-semibold text-slate-900">{item.fullName}</p>
                      <p className="text-sm text-slate-600">{item.phone}</p>
                      <p className="text-sm text-slate-500">
                        {item.loanProductName || item.loanProductSlug || "-"}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge tone={STATUS_TONE[item.status] || "gray"}>
                        {HUMAN_STATUS[item.status] || item.status}
                      </Badge>
                      <Badge tone={KYC_TONE[item.kycStatus] || "gray"}>
                        KYC: {HUMAN_KYC[item.kycStatus] || item.kycStatus || "Not Started"}
                      </Badge>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <InfoTile label="Created" value={formatDate(item.createdAt)} />
                    <InfoTile label="Address" value={item.address || "-"} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <div className="space-y-4">
          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Recent Approved</h2>
                <p className="text-sm text-slate-500">
                  Latest successful approvals.
                </p>
              </div>
              <div className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                {metrics.approved}
              </div>
            </div>

            {loading ? (
              <EmptyState label="Loading approved requests..." />
            ) : recentApproved.length === 0 ? (
              <EmptyState label="No approved requests yet." />
            ) : (
              <div className="space-y-3">
                {recentApproved.map((item) => (
                  <Link
                    key={item._id}
                    to={`/admin/applications/${item._id}`}
                    className="block rounded-2xl border border-slate-200 bg-white p-4 text-slate-900 transition hover:bg-slate-50"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-slate-900">{item.fullName}</p>
                        <p className="text-sm text-slate-500">
                          {item.loanProductName || item.loanProductSlug || "-"}
                        </p>
                      </div>
                      <Badge tone="green">Approved</Badge>
                    </div>
                    <p className="mt-3 text-xs text-slate-500">
                      Updated: {formatDate(item.updatedAt)}
                    </p>
                  </Link>
                ))}
              </div>
            )}
          </section>

          <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-slate-900">Quick Access</h2>
              <p className="text-sm text-slate-500">
                Open the main modules from here.
              </p>
            </div>

            <div className="grid gap-3">
              <QuickLink
                to="/admin/applications"
                icon={UserCheck}
                title="Applications"
                description="Open the customer request queue."
              />
              <QuickLink
                to="/admin/customers"
                icon={BadgeCheck}
                title="Customers"
                description="Check saved customer information."
              />
              <QuickLink
                to="/admin/loan-products"
                icon={CheckCircle2}
                title="Loan Products"
                description="Manage products shown to customers."
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function OverviewCard({ icon: Icon, label, value, accent = "blue", to }) {
  const accents = {
    amber: "bg-amber-50 text-amber-700 ring-amber-100",
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    gray: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  const content = (
    <section className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4 transition hover:bg-white">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
        </div>
        <div className={`rounded-2xl p-3 ring-1 ${accents[accent] || accents.blue}`}>
          <Icon size={18} />
        </div>
      </div>
    </section>
  );

  if (!to) return content;
  return (
    <Link to={to} className="block text-slate-900 no-underline">
      {content}
    </Link>
  );
}

function QuickLink({ to, icon: Icon, title, description }) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 text-slate-900 no-underline transition hover:bg-slate-50"
    >
      <div className="flex items-center gap-3">
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <Icon size={18} />
        </div>
        <div>
          <p className="font-semibold text-slate-900">{title}</p>
          <p className="text-sm text-slate-500">{description}</p>
        </div>
      </div>
      <ArrowRight size={18} className="text-slate-400" />
    </Link>
  );
}

function InfoTile({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-3 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm text-slate-700">{value}</p>
    </div>
  );
}

function EmptyState({ label }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-sm text-slate-500">
      {label}
    </div>
  );
}
