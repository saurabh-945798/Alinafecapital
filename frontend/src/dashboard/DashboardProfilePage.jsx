import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle } from "lucide-react";
import { useParams } from "react-router-dom";
import { useProfile, usePublicProfile } from "../hooks/useProfile";
import { DocumentUpload, ProfileForm } from "../features/dashboard";

export default function DashboardProfilePage() {
  const { token } = useParams();
  const isPublicAccess = !!token;
  const privateProfileState = useProfile(!isPublicAccess);
  const publicProfileState = usePublicProfile(token, isPublicAccess);
  const { profile, loading, error, refresh } = isPublicAccess
    ? publicProfileState
    : privateProfileState;
  const [uiError, setUiError] = useState("");
  const [uiSuccess, setUiSuccess] = useState("");
  const [saveState, setSaveState] = useState(""); // "", "saving", "saved", "error"
  const [selectedEmploymentType, setSelectedEmploymentType] = useState("");
  const [showSavedModal, setShowSavedModal] = useState(false);
  const [profileSectionsComplete, setProfileSectionsComplete] = useState(false);
  const [latestDocuments, setLatestDocuments] = useState(
    Array.isArray(profile?.documents) ? profile.documents : []
  );

  useEffect(() => {
    setLatestDocuments(Array.isArray(profile?.documents) ? profile.documents : []);
  }, [profile?.documents]);

  const completion = profile?.profileCompletion ?? 0;
  const employmentType = String(
    selectedEmploymentType || profile?.employmentType || ""
  )
    .trim()
    .toLowerCase();
  const useTwoDocumentFlow =
    employmentType === "farmer" || employmentType === "self-employed";

  const checklist = useMemo(() => {
    const activeDocuments = Array.isArray(latestDocuments) ? latestDocuments : [];

    if (!profile) return [];

    return [
      { label: "Full Name", done: !!profile.fullName },
      { label: "Phone Number", done: !!profile.phone },
      { label: "Email Address", done: !!profile.email },
      { label: "Profile Photo", done: !!profile.avatarUrl },
      {
        label: "Address (line, city, district)",
        done: !!profile.addressLine1 && !!profile.city && !!profile.district,
      },
      { label: "Employment Info", done: !!profile.employmentType },
      {
        label: "Government ID",
        done:
          String(profile.employmentType || "").trim().toLowerCase() !== "government employee" ||
          !!profile.governmentId,
      },
      { label: "Monthly Income", done: !!profile.monthlyIncome },
      {
        label: "Bank Details (name, account number, branch code)",
        done: !!profile.bankName && !!profile.accountNumber && !!profile.branchCode,
      },
      {
        label: "References (2 names and phone numbers)",
        done:
          !!profile.reference1Name &&
          !!profile.reference1Phone &&
          !!profile.reference2Name &&
          !!profile.reference2Phone,
      },
      {
        label: "National ID Document",
        done: activeDocuments.some((d) => d?.type === "national_id"),
      },
      {
        label: "Bank Statement (3 Months)",
        done: activeDocuments.some((d) => d?.type === "bank_statement_3_months"),
      },
      ...(!useTwoDocumentFlow
        ? [
            {
              label: "Payslip",
              done: activeDocuments.some((d) => d?.type === "payslip_or_business_proof"),
            },
          ]
        : []),
    ];
  }, [latestDocuments, profile, useTwoDocumentFlow]);

  const documentsComplete = useMemo(() => {
    const activeDocuments = Array.isArray(latestDocuments) ? latestDocuments : [];
    const hasNationalId = activeDocuments.some((d) => d?.type === "national_id");
    const hasBankStatement = activeDocuments.some(
      (d) => d?.type === "bank_statement_3_months"
    );
    const hasPayslip = activeDocuments.some(
      (d) => d?.type === "payslip_or_business_proof"
    );

    if (!hasNationalId || !hasBankStatement) return false;
    if (useTwoDocumentFlow) return true;
    return hasPayslip;
  }, [latestDocuments, useTwoDocumentFlow]);

  const canSubmitWholeProfile = profileSectionsComplete && documentsComplete;
  const kycStatus = String(profile?.kycStatus || "not_started").toLowerCase();
  const isUnderReview = kycStatus === "pending";
  const isApproved = kycStatus === "verified";
  const statusBadgeClass = isApproved
    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
    : "border border-amber-200 bg-amber-50 text-amber-700";

  const nextStep =
    completion < 100
      ? "Complete missing fields below."
      : "Profile complete. Upload your remaining KYC documents below.";
  const profileApiBasePath = isPublicAccess
    ? `/inquiries/access/${token}/profile`
    : "/profile/me";
  const profileSubmitUrl = isPublicAccess
    ? `/inquiries/access/${token}/submit`
    : "/profile/me/submit";
  const profileAvatarUrl = isPublicAccess
    ? `/inquiries/access/${token}/avatar`
    : "/profile/me/avatar";

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-500 shadow-sm sm:p-5">
        Loading profile...
      </div>
    );
  }

  if (isUnderReview || isApproved) {
    return (
      <div className="space-y-6">
        {showSavedModal ? (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4">
            <div className="w-full max-w-md rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-2xl">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                <CheckCircle2 size={30} className="text-emerald-700" />
              </div>
              <h3 className="mt-4 text-2xl font-semibold text-slate-900">
                Thank You for Submitting
              </h3>
              <p className="mt-2 text-sm text-slate-600">
                Your profile and KYC have been submitted successfully. They are now under review.
              </p>
            </div>
          </div>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
          <div className="mx-auto max-w-2xl text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 size={30} className="text-emerald-700" />
            </div>
            <h1 className="mt-4 text-2xl font-semibold text-slate-900">
              {isApproved ? "Profile + KYC Approved" : "Profile + KYC Under Review"}
            </h1>
            <p className="mt-3 text-sm text-slate-600">
              {isApproved
                ? "Your profile and KYC have been approved successfully."
                : "Our team is currently reviewing your profile details and uploaded documents."}
            </p>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Completion
                </div>
                <div className="mt-2 text-xl font-semibold text-slate-900">{completion}%</div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Status
                </div>
                <div className="mt-2">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-sm font-semibold capitalize ${statusBadgeClass}`}
                  >
                    {profile?.kycStatus || "pending"}
                  </span>
                </div>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  Submitted On
                </div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {profile?.submittedAt
                    ? new Date(profile.submittedAt).toLocaleString()
                    : "Just now"}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold text-slate-900">Profile + KYC</h1>
            <p className="text-sm text-slate-500">
              {isPublicAccess
                ? "Complete your details, upload documents, and submit your KYC from this secure link."
                : "Complete your details, upload documents, and submit KYC in one place."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-xs sm:text-sm">
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

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(320px,1fr)]">
        <div className="space-y-4 min-w-0">
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

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <ProfileForm
              profile={profile}
              apiBasePath={profileApiBasePath}
              submitUrl={profileSubmitUrl}
              avatarUrl={profileAvatarUrl}
              onEmploymentTypeChange={setSelectedEmploymentType}
              onCompletionChange={setProfileSectionsComplete}
              documentsComplete={documentsComplete}
              onSaved={() => {
                setSaveState("saved");
                setShowSavedModal(true);
                refresh();
                setTimeout(() => {
                  setSaveState("");
                  setShowSavedModal(false);
                }, 5000);
              }}
              onAvatarSaved={() => {
                setUiError("");
                setUiSuccess("");
                refresh();
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

          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
            <div>
              <h2 className="text-base font-semibold text-slate-900">KYC Documents</h2>
              <p className="text-sm text-slate-500">
                Documents are saved immediately after you choose each file.
              </p>
            </div>

            <DocumentUpload
              profile={{
                ...profile,
                documents: latestDocuments,
                employmentType: selectedEmploymentType || profile?.employmentType || "",
              }}
              uploadUrl={
                isPublicAccess
                  ? `/inquiries/access/${token}/doc`
                  : "/profile/me/doc"
              }
              onUploaded={(nextProfile) => {
                setUiError("");
                if (Array.isArray(nextProfile?.documents)) {
                  setLatestDocuments(nextProfile.documents);
                }
              }}
              setError={(msg) => setUiError(msg)}
              setSuccess={() => {}}
            />
          </div>

          <div className="sticky bottom-0 z-10 flex flex-col items-stretch justify-between gap-3 rounded-xl border border-slate-200 bg-white/95 px-3 py-3 backdrop-blur sm:px-4 sm:flex-row sm:items-center">
            <div className="text-xs font-medium leading-5 text-slate-500">
              {saveState === "saving" && "Saving..."}
              {saveState === "saved" && "Saved just now"}
              {saveState === "error" && "Error saving changes"}
              {!canSubmitWholeProfile &&
                saveState === "" &&
                "Complete all profile details and required KYC documents first"}
            </div>

            {canSubmitWholeProfile ? (
              <div className="flex w-full sm:w-auto">
                <button
                  type="submit"
                  form="profileForm"
                  className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 sm:w-auto"
                >
                  Submit  
                </button>
              </div>
            ) : null}
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-600">
            Complete profile fields and upload your documents from this page.
          </div>
        </div>

        <div className="space-y-4 min-w-0">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5 xl:sticky xl:top-6">
            <h3 className="mb-3 text-base font-semibold text-slate-900">Completion Checklist</h3>

            <div className="space-y-2 text-sm">
              {checklist.map((item) => (
                <div
                  key={item.label}
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-100 px-3 py-2"
                >
                  <span className="min-w-0 text-slate-700">{item.label}</span>

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

      {showSavedModal ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/55 px-4">
          <div className="w-full max-w-md rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
              <CheckCircle2 size={30} className="text-emerald-700" />
            </div>
            <h3 className="mt-4 text-2xl font-semibold text-slate-900">Details Saved</h3>
            <p className="mt-2 text-sm text-slate-600">
              Your profile and KYC have been submitted successfully. They are now under review.
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
