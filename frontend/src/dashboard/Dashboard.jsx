import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../hooks/useProfile";
import { getKycGate } from "../utils/kycGate";

function StatusChip({ ok, label }) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold",
        ok
          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
          : "border-amber-200 bg-amber-50 text-amber-700",
      ].join(" ")}
    >
      {label}
    </span>
  );
}

function Card({ children, className = "" }) {
  return <section className={["rounded-2xl border bg-white p-5 shadow-sm", className].join(" ")}>{children}</section>;
}

export default function Dashboard() {
  const { user } = useAuth();
  const { profile, loading, error } = useProfile();

  const gate = getKycGate(profile);
  const fullName = profile?.fullName || user?.fullName || "Customer";
  const completion = Number(gate?.completion || 0);
  const canApply = !!gate?.canApply;

  if (loading) {
    return (
      <section className="rounded-2xl border bg-white p-5">
        <p className="text-sm text-slate-600">Loading dashboard...</p>
      </section>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border bg-white p-5 shadow-sm">
        <p className="text-xs text-slate-500">Welcome back</p>
        <h1 className="mt-1 text-2xl font-semibold text-slate-900">{fullName}</h1>
        <p className="mt-1 text-sm text-slate-600">Keep your account updated to apply faster.</p>
      </section>

      {error ? (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
        </section>
      ) : null}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <Card
          className={[
            "lg:col-span-2 transition",
            !canApply ? "animate-pulse" : "",
            canApply
              ? "border-emerald-200"
              : "border-amber-300 bg-amber-50/40 ring-2 ring-amber-200",
          ].join(" ")}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Profile + KYC</h2>
              <p className="text-sm text-slate-600">
                {canApply
                  ? "Great. Your account is ready for application."
                  : gate?.blockReason || "Complete profile and KYC to unlock application."}
              </p>
            </div>
            <StatusChip ok={canApply} label={canApply ? "Ready" : "Action Required"} />
          </div>

          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>Completion</span>
              <span>{completion}%</span>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className={canApply ? "h-full bg-emerald-500" : "h-full bg-amber-500"}
                style={{ width: `${Math.max(0, Math.min(100, completion))}%` }}
              />
            </div>
          </div>

          <div className="mt-5">
            <Link
              to="/dashboard/profile-completion"
              className={[
                "inline-flex items-center rounded-xl px-4 py-2 text-sm font-semibold transition",
                canApply
                  ? "border border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
                  : "bg-slate-900 text-white hover:bg-slate-800",
              ].join(" ")}
            >
              {canApply ? "View Profile + KYC" : "Complete Profile + KYC"}
            </Link>
          </div>
        </Card>

        <Card className="lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">My Applications</h2>
              <p className="text-sm text-slate-600">Track submitted and pre-applications.</p>
            </div>
            <div className="flex gap-2">
              <Link
                to="/dashboard/my-applications"
                className="inline-flex items-center rounded-xl border px-3 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
              >
                Open Applications
              </Link>
              <Link
                to="/apply"
                className="inline-flex items-center rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
              >
                Apply Loan
              </Link>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
