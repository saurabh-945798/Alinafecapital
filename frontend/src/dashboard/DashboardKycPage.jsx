import { Link } from "react-router-dom";
import { CheckCircle2, Clock3, FileCheck2, ShieldCheck, UserRound, XCircle } from "lucide-react";
import { useProfile } from "../hooks/useProfile";

const statusMeta = {
  not_started: {
    label: "Not Submitted",
    description: "Your identity verification has not yet been submitted for review.",
    tone: "border-slate-200 bg-slate-50 text-slate-700",
    icon: UserRound,
  },
  pending: {
    label: "Under Review",
    description: "Your KYC information has been submitted and is awaiting verification.",
    tone: "border-amber-200 bg-amber-50 text-amber-800",
    icon: Clock3,
  },
  verified: {
    label: "Verified",
    description: "Your identity and KYC documents have been verified.",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Action Required",
    description: "Your KYC review needs attention. Review the remarks and update the required information.",
    tone: "border-rose-200 bg-rose-50 text-rose-800",
    icon: XCircle,
  },
};

const updateLabels = {
  none: "No KYC update in progress",
  draft: "KYC update draft",
  pending_review: "KYC update awaiting review",
  approved: "Latest KYC update approved",
  rejected: "Latest KYC update needs correction",
};

export default function DashboardKycPage() {
  const { profile, loading, error, refresh } = useProfile();
  const rawStatus = String(profile?.kycStatus || "not_started").toLowerCase();
  const meta = statusMeta[rawStatus] || statusMeta.not_started;
  const StatusIcon = meta.icon;
  const completion = Number(profile?.profileCompletion || 0);

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
        <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-[#002D5B]" />
        <p className="mt-3 text-sm text-slate-600">Loading your KYC status...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="rounded-3xl border border-blue-100 bg-gradient-to-br from-[#002D5B] via-[#123d6f] to-[#315d8e] p-6 text-white shadow-lg">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/70">
              <ShieldCheck size={15} /> KYC Verification
            </div>
            <h1 className="mt-2 text-2xl font-bold">Know Your Customer Status</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/80">
              KYC confirms your identity and supporting documents. It is separate from Profile Completion, which measures whether your account details are filled in.
            </p>
          </div>
          <button onClick={refresh} type="button" className="rounded-xl border border-white/25 bg-white/10 px-4 py-2 text-sm font-semibold hover:bg-white/15">
            Refresh Status
          </button>
        </div>
      </section>

      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div> : null}

      <div className="grid gap-5 lg:grid-cols-2">
        <section className={`rounded-2xl border p-5 shadow-sm ${meta.tone}`}>
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-white/80 p-2 shadow-sm"><StatusIcon size={22} /></div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.15em] opacity-70">KYC Status</p>
              <h2 className="mt-1 text-xl font-bold">{meta.label}</h2>
              <p className="mt-2 text-sm leading-6 opacity-90">{meta.description}</p>
            </div>
          </div>
          {profile?.kycRemarks ? (
            <div className="mt-4 rounded-xl border border-current/10 bg-white/70 px-4 py-3 text-sm">
              <span className="font-semibold">Review remarks:</span> {profile.kycRemarks}
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-blue-50 p-2 text-[#002D5B]"><FileCheck2 size={22} /></div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Profile Completion</p>
              <h2 className="mt-1 text-xl font-bold text-slate-900">{completion}% Complete</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Profile Completion only measures whether your personal, contact, employment, banking and reference details are filled in. It does not mean KYC has been verified.
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
            <div className="h-full rounded-full bg-[#B38E46]" style={{ width: `${Math.min(100, Math.max(0, completion))}%` }} />
          </div>
          <Link to="/dashboard/profile-completion" className="mt-4 inline-flex rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-[#002D5B] hover:bg-slate-50">
            Review Profile Completion
          </Link>
        </section>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="text-base font-semibold text-slate-900">KYC Update Activity</h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">Current update status</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">{updateLabels[profile?.kycUpdateStatus] || updateLabels.none}</p>
          </div>
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs text-slate-500">Last profile update</p>
            <p className="mt-1 text-sm font-semibold text-slate-800">
              {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString("en-GB") : "No update recorded"}
            </p>
          </div>
        </div>
        {profile?.kycUpdateReason ? <p className="mt-3 text-sm text-slate-600"><span className="font-semibold">Update reason:</span> {profile.kycUpdateReason}</p> : null}
      </section>
    </div>
  );
}
