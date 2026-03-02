import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useProfile } from "../hooks/useProfile";
import { getKycGate } from "../utils/kycGate";

export default function DashboardEligibilityPage() {
  const { profile, loading, error } = useProfile();
  const gate = useMemo(() => getKycGate(profile), [profile]);

  if (loading) return <div className="p-4">Loading eligibility...</div>;

  return (
    <section className="rounded-xl border bg-white p-4 space-y-4">
      <h2 className="text-lg font-semibold">Eligibility Details</h2>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-2 text-sm sm:grid-cols-2">
        <p><span className="font-medium">Profile Completion:</span> {gate.completion}%</p>
        <p><span className="font-medium">KYC Status:</span> {gate.kycStatus}</p>
        <p><span className="font-medium">Can Apply:</span> {gate.canApply ? "Yes" : "No"}</p>
      </div>

      {!gate.canApply && (
        <div className="rounded border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          {gate.blockReason}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Link to="/dashboard/profile-completion" className="rounded border px-3 py-2 text-sm hover:bg-slate-50">
          Complete Profile
        </Link>
        <Link to="/dashboard/kyc-status" className="rounded border px-3 py-2 text-sm hover:bg-slate-50">
          Update KYC
        </Link>
      </div>
    </section>
  );
}
