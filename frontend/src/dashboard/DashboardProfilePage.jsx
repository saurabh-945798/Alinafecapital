import { useMemo, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { useProfile } from "../hooks/useProfile";
import { DocumentUpload, ProfileForm } from "../features/dashboard";

export default function DashboardProfilePage() {
  const { profile, loading, error, refresh } = useProfile();
  const [uiError, setUiError] = useState("");
  const [uiSuccess, setUiSuccess] = useState("");
  const [saveState, setSaveState] = useState(""); // "", "saving", "saved", "error"
  const [selectedEmploymentType, setSelectedEmploymentType] = useState("");

  const completion = profile?.profileCompletion ?? 0;
  const employmentType = String(
    selectedEmploymentType || profile?.employmentType || ""
  )
    .trim()
    .toLowerCase();
  const useTwoDocumentFlow =
    employmentType === "farmer" || employmentType === "self-employed";

  const checklist = useMemo(() => {
    if (!profile) return [];

    return [
      { label: "Full Name", done: !!profile.fullName },
      { label: "Phone Number", done: !!profile.phone },
      { label: "Email Address", done: !!profile.email },
      {
        label: "Address (line, city, district)",
        done: !!profile.addressLine1 && !!profile.city && !!profile.district,
      },
      { label: "Employment Info", done: !!profile.employmentType },
      { label: "Monthly Income", done: !!profile.monthlyIncome },
      {
        label: "Bank Details (name, account number, branch code)",
        done: !!profile.bankName && !!profile.accountNumber && !!profile.branchCode,
      },
      {
        label: "National ID Document",
        done: Array.isArray(profile.documents) && profile.documents.some((d) => d?.type === "national_id"),
      },
      {
        label: "Bank Statement (3 Months)",
        done:
          Array.isArray(profile.documents) &&
          profile.documents.some((d) => d?.type === "bank_statement_3_months"),
      },
      ...(!useTwoDocumentFlow
        ? [
            {
              label: "Payslip",
              done:
                Array.isArray(profile.documents) &&
                profile.documents.some((d) => d?.type === "payslip_or_business_proof"),
            },
          ]
        : []),
    ];
  }, [profile, useTwoDocumentFlow]);

  const nextStep =
    completion < 100
      ? "Complete missing fields below."
      : "Profile complete. Upload your remaining KYC documents below.";

  if (loading) return <div className="p-4">Loading profile...</div>;

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-slate-900">Profile + KYC</h1>
            <p className="text-sm text-slate-500">
              Complete your details, upload documents, and submit KYC in one place.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm">
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium text-slate-700">
              Completion: {completion}%
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-medium capitalize text-slate-700">
              KYC: {profile?.kycStatus || "Not started"}
            </span>
            <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-500">
              Last updated: {profile?.updatedAt ? new Date(profile.updatedAt).toLocaleDateString() : "-"}
            </span>
          </div>
        </div>

        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${completion}%` }}
          />
        </div>

        <p className="text-sm text-slate-600">{nextStep}</p>
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          {error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {uiError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {uiError}
            </div>
          ) : null}

          {uiSuccess ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {uiSuccess}
            </div>
          ) : null}

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <ProfileForm
              profile={profile}
              onEmploymentTypeChange={setSelectedEmploymentType}
              onSaved={() => {
                setSaveState("saved");
                refresh();
                setTimeout(() => setSaveState(""), 3000);
              }}
              setError={(msg) => {
                setSaveState("error");
                setUiError(msg);
              }}
              setSuccess={(msg) => {
                setSaveState("saved");
                setUiSuccess(msg);
              }}
            />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900">KYC Documents</h2>
              <p className="text-sm text-slate-500">
                Upload each document separately. You can upload one now and the rest later.
              </p>
            </div>

            <DocumentUpload
              profile={{
                ...profile,
                employmentType: selectedEmploymentType || profile?.employmentType || "",
              }}
              onUploaded={() => {
                setUiSuccess("Documents uploaded successfully.");
                refresh();
              }}
              setError={(msg) => setUiError(msg)}
              setSuccess={(msg) => setUiSuccess(msg)}
            />
          </div>

          <div className="sticky bottom-0 z-10 flex flex-col items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-4 py-3 backdrop-blur sm:flex-row">
            <div className="text-xs font-medium text-slate-500">
              {saveState === "saving" && "Saving..."}
              {saveState === "saved" && "Saved just now"}
              {saveState === "error" && "Error saving changes"}
            </div>

            <div className="flex w-full gap-3 sm:w-auto">
              <button
                type="submit"
                form="profileForm"
                className="w-full rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
              >
                Save Changes
              </button>

              <button
                type="reset"
                form="profileForm"
                className="w-full rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium transition hover:bg-slate-100 sm:w-auto"
              >
                Cancel
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Complete profile fields and upload your documents from this page.
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6">
            <h3 className="mb-3 text-base font-semibold text-slate-900">Completion Checklist</h3>

            <div className="space-y-2 text-sm">
              {checklist.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between rounded-lg border border-slate-100 px-3 py-2"
                >
                  <span className="text-slate-700">{item.label}</span>

                  {item.done ? (
                    <CheckCircle2 size={16} className="text-emerald-600" aria-label="Completed" />
                  ) : (
                    <Circle size={14} className="text-amber-500" aria-label="Pending" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
