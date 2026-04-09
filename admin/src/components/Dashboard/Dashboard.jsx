import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  Landmark,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
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
  DISBURSED: "blue",
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
  KYC_REJECTED: "Rejected",
  APPROVED: "Approved",
  DISBURSED: "Disbursed",
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
    verified: 0,
    rejected: 0,
    approved: 0,
    disbursed: 0,
    closed: 0,
    actionRequired: 0,
  });
  const [needsAction, setNeedsAction] = useState([]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  const pendingCount = Number(metrics.newRequests || 0) + Number(metrics.pendingFollowUp || 0);

  const fetchDashboard = async () => {
    setLoading(true);
    setError("");

    try {
      const summary = await dashboardApi.getSummary();
      setMetrics(
        summary?.metrics || {
          newRequests: 0,
          pendingFollowUp: 0,
          needsKyc: 0,
          verified: 0,
          rejected: 0,
          approved: 0,
          disbursed: 0,
          closed: 0,
          actionRequired: 0,
        }
      );
      setNeedsAction(summary?.needsAction || []);
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
    <div className="space-y-5">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-500">{greeting}</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">
              Dashboard Overview
            </h1>
            <p className="max-w-2xl text-sm text-slate-500">
              Track pending requests, KYC follow-up, approvals, and closures from one clean view.
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

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Queue Summary</h2>
            <p className="text-sm text-slate-500">
              Keep the full request pipeline visible without extra noise.
            </p>
          </div>

          <div className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Action Required: {metrics.actionRequired}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
          <OverviewCard
            icon={Clock3}
            label="Pending"
            value={pendingCount}
            accent="blue"
            subtitle="New and follow-up requests"
          />
          <OverviewCard
            icon={ShieldAlert}
            label="KYC"
            value={metrics.needsKyc}
            accent="indigo"
            subtitle="Waiting for customer KYC"
          />
          <OverviewCard
            icon={ShieldCheck}
            label="Verified"
            value={metrics.verified}
            accent="green"
            subtitle="KYC completed and verified"
          />
          <OverviewCard
            icon={XCircle}
            label="Rejected"
            value={metrics.rejected}
            accent="rose"
            subtitle="KYC correction required"
          />
          <OverviewCard
            icon={CheckCircle2}
            label="Approved"
            value={metrics.approved}
            accent="green"
            subtitle="Ready for branch follow-up"
          />
          <OverviewCard
            icon={Landmark}
            label="Disbursed"
            value={metrics.disbursed}
            accent="blue"
            subtitle="Moved into accounts"
          />
          <OverviewCard
            icon={ArrowRight}
            label="Closed"
            value={metrics.closed}
            accent="gray"
            subtitle="Completed or not proceeding"
          />
        </div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Pending Applications</h2>
            <p className="text-sm text-slate-500">
              Open customer requests that still need action from the team.
            </p>
          </div>
          <Link
            to="/admin/applications"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View All
            <ArrowRight size={16} />
          </Link>
        </div>

        {loading ? (
          <EmptyState label="Loading applications..." />
        ) : needsAction.length === 0 ? (
          <EmptyState label="No pending applications right now." />
        ) : (
          <div className="grid gap-3 xl:grid-cols-2">
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
    </div>
  );
}

function OverviewCard({ icon: Icon, label, value, accent = "blue", subtitle = "" }) {
  const accents = {
    blue: "bg-blue-50 text-blue-700 ring-blue-100",
    indigo: "bg-indigo-50 text-indigo-700 ring-indigo-100",
    rose: "bg-rose-50 text-rose-700 ring-rose-100",
    green: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    gray: "bg-slate-100 text-slate-700 ring-slate-200",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-semibold text-slate-950">{value}</p>
          <p className="mt-2 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className={`rounded-2xl p-3 ring-1 ${accents[accent] || accents.blue}`}>
          <Icon size={18} />
        </div>
      </div>
    </div>
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
