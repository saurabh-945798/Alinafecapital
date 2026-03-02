import { useState } from "react";
import { Link } from "react-router-dom";
import { useProfile } from "../hooks/useProfile";
import { ProfileForm } from "../features/dashboard";

export default function DashboardAccountInfoPage() {
  const { profile, loading, error, refresh } = useProfile();
  const [uiError, setUiError] = useState("");
  const [uiSuccess, setUiSuccess] = useState("");

  if (loading) return <div className="p-4">Loading account info...</div>;

  const completion = profile?.profileCompletion ?? 0;
  const accountStatus = profile?.accountStatus || "Active";

  return (
    <div className="space-y-6">

      {/* ACCOUNT SUMMARY */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-slate-800">
              Account Information
            </h1>
            <p className="text-sm text-slate-500">
              Manage your personal and account details.
            </p>
          </div>

          <div className="flex flex-wrap gap-3 text-sm">
            <span className="rounded-full bg-slate-100 px-3 py-1 font-medium">
              Completion: {completion}%
            </span>

            <span
              className={`rounded-full px-3 py-1 font-medium ${
                accountStatus === "Active"
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {accountStatus}
            </span>
          </div>
        </div>

        <div className="grid gap-2 text-sm sm:grid-cols-2">
          <p><span className="font-medium">Name:</span> {profile?.fullName || "-"}</p>
          <p><span className="font-medium">Phone:</span> {profile?.phone || "-"}</p>
          <p><span className="font-medium">Email:</span> {profile?.email || "-"}</p>
          <p><span className="font-medium">Customer ID:</span> {profile?.customerId || "-"}</p>
        </div>

        <p className="text-xs text-slate-400">
          Last profile update:{" "}
          {profile?.updatedAt
            ? new Date(profile.updatedAt).toLocaleDateString()
            : "—"}
        </p>
      </section>

      {/* ERROR / SUCCESS */}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {uiError && <p className="text-sm text-red-600">{uiError}</p>}
      {uiSuccess && <p className="text-sm text-green-600">{uiSuccess}</p>}

      {/* PROFILE FORM SECTION */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <ProfileForm
          profile={profile}
          onSaved={() => {
            refresh();
            setUiSuccess("Changes saved successfully.");
          }}
          setError={setUiError}
          setSuccess={setUiSuccess}
        />
      </section>

      {/* SECURITY PANEL */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <h3 className="text-base font-semibold text-slate-800">
          Security
        </h3>

        <div className="flex flex-col sm:flex-row gap-3">
          <button className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-100 transition w-full sm:w-auto">
            Change Password
          </button>

          <button className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-100 transition w-full sm:w-auto">
            Logout from all devices
          </button>
        </div>

        <p className="text-xs text-slate-500">
          2FA Status: Not enabled (coming soon)
        </p>
      </section>

      {/* STICKY SAVE BAR */}
      <div className="sticky bottom-0 bg-white border-t pt-4 pb-2 flex flex-col sm:flex-row gap-3 justify-between items-center">
        <div className="text-xs text-slate-500">
          Your data is protected and used for verification only.
        </div>

        <div className="flex w-full sm:w-auto gap-3">
          <button
            type="submit"
            form="profileForm"
            className="w-full sm:w-auto rounded-xl bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 transition"
          >
            Save Changes
          </button>

          <button
            type="reset"
            form="profileForm"
            className="w-full sm:w-auto rounded-xl border px-4 py-2 text-sm hover:bg-slate-100 transition"
          >
            Reset
          </button>

          <Link
            to="/dashboard/kyc-status"
            className="w-full sm:w-auto rounded-xl border px-4 py-2 text-sm hover:bg-slate-100 transition text-center"
          >
            Go to KYC
          </Link>
        </div>
      </div>

      {/* COMPLETION LINK */}
      <div className="text-sm text-slate-500">
        Want to improve approval speed?
        <Link
          to="/dashboard/profile-completion"
          className="ml-2 text-slate-700 hover:underline"
        >
          Complete your profile
        </Link>
      </div>

    </div>
  );
}