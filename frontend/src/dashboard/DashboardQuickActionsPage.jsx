import { Link } from "react-router-dom";
import { useProfile } from "../hooks/useProfile";
import { getKycGate } from "../utils/kycGate";

export default function DashboardQuickActionsPage() {
  const { profile } = useProfile();
  const gate = getKycGate(profile);

  const completion = gate?.completion || 0;
  const kycStatus = gate?.kycStatus || "not_started";

  const pendingActions =
    (!gate.canApply ? 1 : 0) +
    (completion < 100 ? 1 : 0) +
    (kycStatus !== "verified" ? 1 : 0);

  const nextBestStep =
    completion < 100
      ? "Complete your profile"
      : kycStatus !== "verified"
      ? "Submit your KYC"
      : !gate.canApply
      ? "Check eligibility"
      : "Start your application";

  return (
    <div className="space-y-6">

      {/* PAGE HEADER */}
      <section className="space-y-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-xl font-semibold text-slate-800">
              Quick Actions
            </h1>
            <p className="text-sm text-slate-500">
              Complete your account and move forward faster.
            </p>
          </div>

          <span className="rounded-full bg-amber-50 text-amber-700 border border-amber-200 px-3 py-1 text-xs font-semibold">
            {pendingActions} actions pending
          </span>
        </div>
      </section>

      {/* PROGRESS CONTEXT BLOCK */}
      <section className="rounded-2xl border bg-white p-5 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          
          <div className="space-y-2">
            <p className="text-sm font-medium text-slate-700">
              Profile Completion: {completion}%
            </p>
            <div className="w-56 h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 transition-all"
                style={{ width: `${completion}%` }}
              />
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-sm text-slate-700">
              KYC Status:{" "}
              <span className="capitalize font-medium">
                {kycStatus.replace("_", " ")}
              </span>
            </p>
            <p className="text-xs text-slate-500">
              Next best step: <span className="font-medium">{nextBestStep}</span>
            </p>
          </div>
        </div>
      </section>

      {/* ACTION CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* COMPLETE PROFILE (Priority) */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-slate-800">
              Complete Profile
            </h3>
            <p className="text-sm text-slate-600">
              Add your personal and employment details.
            </p>
          </div>

          <div className="pt-4">
            <Link
              to="/dashboard/profile-completion"
              className="inline-flex items-center justify-center rounded-xl bg-slate-900 text-white px-4 py-2 text-sm font-medium hover:bg-slate-800 transition"
            >
              Complete Profile
            </Link>
          </div>
        </div>

        {/* UPDATE KYC */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-slate-800">
              Update KYC
            </h3>
            <p className="text-sm text-slate-600">
              Upload valid ID documents for verification.
            </p>
          </div>

          <div className="pt-4">
            <Link
              to="/dashboard/kyc-status"
              className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm hover:bg-slate-50 transition"
            >
              Update KYC
            </Link>
          </div>
        </div>

        {/* CHECK ELIGIBILITY */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-slate-800">
              Check Eligibility
            </h3>
            <p className="text-sm text-slate-600">
              See if you meet the loan requirements.
            </p>
          </div>

          <div className="pt-4">
            <Link
              to="/dashboard/eligibility"
              className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm hover:bg-slate-50 transition"
            >
              Check Eligibility
            </Link>
          </div>
        </div>

        {/* START APPLICATION */}
        <div className="rounded-2xl border bg-white p-5 shadow-sm hover:-translate-y-0.5 hover:shadow-md transition-all duration-200 flex flex-col justify-between">
          <div className="space-y-2">
            <h3 className="text-base font-semibold text-slate-800">
              Start Application
            </h3>
            <p className="text-sm text-slate-600">
              Begin your loan application process.
            </p>
          </div>

          <div className="pt-4 space-y-2">
            {gate.canApply ? (
              <Link
                to="/apply"
                className="inline-flex items-center justify-center rounded-xl border px-4 py-2 text-sm hover:bg-slate-50 transition"
              >
                Start Application
              </Link>
            ) : (
              <>
                <button
                  disabled
                  className="w-full rounded-xl border px-4 py-2 text-sm text-slate-400 cursor-not-allowed"
                >
                  Start Application
                </button>
                <p className="text-xs text-red-500">
                  {gate.blockReason || "Complete required steps first."}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* HELP FOOTER */}
      <section className="pt-4 border-t flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <p className="text-sm text-slate-600">
          Need help with your application?
        </p>

        <div className="flex gap-4 text-sm">
          <Link to="/contact-officer" className="text-slate-700 hover:underline">
            Contact Officer
          </Link>
          <Link to="/help-center" className="text-slate-700 hover:underline">
            Help Center
          </Link>
        </div>
      </section>

    </div>
  );
}