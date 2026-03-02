import { useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../services/api";
import { useProfile } from "../hooks/useProfile";
import { getKycGate } from "../utils/kycGate";
import { DocumentUpload } from "../features/dashboard";

export default function DashboardKycPage() {
  const { profile, loading, error, refresh } = useProfile();

  const [uiError, setUiError] = useState("");
  const [uiSuccess, setUiSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // optional: focus user to upload section
  const uploadRef = useRef(null);

  const gate = useMemo(() => getKycGate(profile), [profile]);
  const kycStatus = gate?.kycStatus || "not_started";
  const completion = gate?.completion || 0;

  const docs = useMemo(() => profile?.documents || [], [profile]);
  const docTypes = useMemo(() => new Set(docs.map((d) => d?.type)), [docs]);

  const hasNationalId = docTypes.has("national_id");
  const hasBankStatement = docTypes.has("bank_statement_3_months");
  const hasIncomeProof = docTypes.has("payslip_or_business_proof");
  const hasAllRequiredDocs = hasNationalId && hasBankStatement && hasIncomeProof;

  const canSubmit =
    completion === 100 &&
    hasAllRequiredDocs &&
    kycStatus !== "pending" &&
    kycStatus !== "verified";

  const missingReasons = useMemo(() => {
    const reasons = [];
    if (completion !== 100) reasons.push("Complete your profile to 100%");
    if (!hasNationalId) reasons.push("Upload National ID (PDF)");
    if (!hasBankStatement) reasons.push("Upload Bank statement (3 months, PDF)");
    if (!hasIncomeProof) reasons.push("Upload Payslip or business proof (PDF)");
    if (kycStatus === "pending") reasons.push("KYC is already under review");
    if (kycStatus === "verified") reasons.push("KYC is already verified");
    return reasons;
  }, [completion, hasNationalId, hasBankStatement, hasIncomeProof, kycStatus]);

  const scrollToUpload = () => {
    uploadRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submitKyc = async () => {
    setUiError("");
    setUiSuccess("");
    setSubmitting(true);

    try {
      await api.post("/profile/me/submit", {});
      setUiSuccess("KYC submitted successfully.");
      await refresh();
    } catch (err) {
      setUiError(err?.response?.data?.message || "Failed to submit KYC.");
    } finally {
      setSubmitting(false);
    }
  };

  const statusLabel = useMemo(() => kycStatus.replace(/_/g, " "), [kycStatus]);

  const statusBadgeClass = useMemo(() => {
    const base =
      "px-3 py-1.5 text-xs font-semibold rounded-full inline-flex items-center gap-2 border";
    switch (kycStatus) {
      case "verified":
        return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
      case "pending":
        return `${base} bg-amber-50 text-amber-700 border-amber-200`;
      case "rejected":
        return `${base} bg-red-50 text-red-700 border-red-200`;
      default:
        return `${base} bg-slate-100 text-slate-700 border-slate-200`;
    }
  }, [kycStatus]);

  const summaryNextAction = useMemo(() => {
    if (kycStatus === "verified") return "You can now apply for a loan.";
    if (kycStatus === "pending") return "KYC is under review. No action needed.";
    if (kycStatus === "rejected") return "Fix documents and resubmit KYC.";
    if (completion !== 100) return "Complete your profile to 100% first.";
    if (!hasAllRequiredDocs) return "Upload all required documents (PDF).";
    return "Submit KYC to start verification.";
  }, [kycStatus, completion, hasAllRequiredDocs]);

  const metaRow = useMemo(() => {
    const parts = [];
    if (profile?.updatedAt) parts.push(`Last updated: ${new Date(profile.updatedAt).toLocaleDateString()}`);
    if (profile?.submittedAt) parts.push(`Submitted on: ${new Date(profile.submittedAt).toLocaleDateString()}`);
    return parts.join(" • ");
  }, [profile?.updatedAt, profile?.submittedAt]);

  const findDocUploadedAt = (type) => {
    const doc = docs.find((d) => d?.type === type);
    const date = doc?.uploadedAt || doc?.createdAt || doc?.updatedAt;
    return date ? new Date(date).toLocaleDateString() : null;
  };

  const DocCard = ({ title, type, statusOk }) => {
    const uploadedDate = findDocUploadedAt(type);

    return (
      <div className="rounded-2xl border bg-white p-5 shadow-sm hover:shadow transition space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-800">{title}</p>
            <p className="text-xs text-slate-500">Accepted format: PDF only</p>
          </div>

          <span
            className={
              statusOk
                ? "text-xs font-semibold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200"
                : "text-xs font-semibold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200"
            }
          >
            {statusOk ? "Uploaded" : "Missing"}
          </span>
        </div>

        <div className="text-xs text-slate-500">
          {statusOk ? `Uploaded: ${uploadedDate || "—"}` : "Upload to continue"}
        </div>

        <button
          type="button"
          onClick={scrollToUpload}
          className="w-full rounded-xl border px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#B38E46]"
        >
          {statusOk ? "Replace PDF" : "Upload PDF"}
        </button>

        <p className="text-xs text-slate-500">
          Tip: upload a clear scan, all pages visible, no password protection.
        </p>
      </div>
    );
  };

  const StepPill = ({ done, label }) => (
    <div
      className={
        done
          ? "rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-semibold"
          : "rounded-full bg-slate-100 text-slate-700 border border-slate-200 px-3 py-1 text-xs font-semibold"
      }
    >
      {done ? "✓ " : "• "}
      {label}
    </div>
  );

  const ChecklistRow = ({ ok, text }) => (
    <div className="flex items-start gap-2">
      <span className={ok ? "text-emerald-600" : "text-amber-600"}>
        {ok ? "✓" : "⚠"}
      </span>
      <p className="text-sm text-slate-700">{text}</p>
    </div>
  );

  if (loading) return <div className="p-4">Loading KYC...</div>;

  return (
    <div className="space-y-6">
      {/* Top summary card */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-slate-800">KYC Verification</h1>

            <div className="flex flex-wrap items-center gap-2">
              <span className={statusBadgeClass}>{statusLabel}</span>

              <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                Completion: {completion}%
              </span>
            </div>

            <p className="text-sm text-slate-600">{summaryNextAction}</p>

            {metaRow ? <p className="text-xs text-slate-400">{metaRow}</p> : null}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={scrollToUpload}
              className="rounded-xl border px-4 py-2 text-sm font-semibold text-slate-800 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#B38E46]"
            >
              Upload documents
            </button>

            <Link
              to="/dashboard"
              className="rounded-xl bg-[#002D5B] text-white px-4 py-2 text-sm font-semibold hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#B38E46]"
            >
              Back to Dashboard
            </Link>
          </div>
        </div>

        {/* progress steps UI */}
        <div className="flex flex-wrap gap-2 pt-2">
          <StepPill done={hasAllRequiredDocs} label="1. Upload docs" />
          <StepPill done={kycStatus !== "not_started" && kycStatus !== "rejected"} label="2. Submit KYC" />
          <StepPill done={kycStatus === "pending" || kycStatus === "verified"} label="3. Under review" />
          <StepPill done={kycStatus === "verified" || kycStatus === "rejected"} label="4. Decision" />
        </div>
      </section>

      {/* 2-column layout */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* LEFT: Status + Upload flow (2 columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Rejection resolve block */}
          {kycStatus === "rejected" && (
            <section className="rounded-2xl border border-red-200 bg-red-50 p-5 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-red-800">KYC Rejected</p>
                  <p className="text-sm text-red-700 mt-1">
                    Reason: {profile?.kycRemarks || "Documents unclear."}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={scrollToUpload}
                  className="rounded-xl bg-red-600 text-white px-4 py-2 text-sm font-semibold hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-[#B38E46]"
                >
                  Re-upload & Resubmit
                </button>
              </div>

              <ul className="text-sm text-red-700 list-disc pl-5 space-y-1">
                <li>Upload clear PDF documents only.</li>
                <li>Make sure all required pages are visible.</li>
                <li>Do not upload password-protected PDF files.</li>
              </ul>
            </section>
          )}

          {/* global messages */}
          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {uiError ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {uiError}
            </div>
          ) : null}
          {uiSuccess ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
              {uiSuccess}
            </div>
          ) : null}

          {/* Required docs as individual cards */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-800">Required Documents</h2>
              <p className="text-xs text-slate-500">PDF only • Max 6MB</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <DocCard
                title="National ID (Malawi)"
                type="national_id"
                statusOk={hasNationalId}
              />
              <DocCard
                title="Bank statement (last 3 months)"
                type="bank_statement_3_months"
                statusOk={hasBankStatement}
              />
              <DocCard
                title="Payslip or business proof"
                type="payslip_or_business_proof"
                statusOk={hasIncomeProof}
              />
            </div>
          </section>

          {/* Actual upload component (keeping backend flow intact) */}
          <section
            ref={uploadRef}
            className="rounded-2xl border bg-white p-6 shadow-sm space-y-3"
          >
            <h3 className="text-base font-semibold text-slate-800">Upload PDFs</h3>
            <p className="text-sm text-slate-600">
              Upload the required documents. After upload, submit KYC for review.
            </p>

            {/* IMPORTANT: Keeping your upload flow untouched */}
            <DocumentUpload
              onUploaded={refresh}
              setError={setUiError}
              setSuccess={setUiSuccess}
            />

            <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
              <p className="text-sm font-semibold text-slate-800">Document policy</p>
              <ul className="text-sm list-disc pl-5 space-y-1 text-slate-600">
                <li>PDF only</li>
                <li>Max size: 6MB per document</li>
                <li>Clear scan, all pages visible</li>
                <li>No password-protected files</li>
              </ul>
            </div>
          </section>
        </div>

        {/* RIGHT: Checklist + timeline + tips + sticky submit panel */}
        <div className="space-y-6">
          {/* Icon checklist */}
          <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-slate-800">Checklist</h3>

            <div className="space-y-3">
              <ChecklistRow ok={completion === 100} text="Profile completion is 100%" />
              <ChecklistRow ok={hasNationalId} text="National ID Malawi uploaded (PDF)" />
              <ChecklistRow ok={hasBankStatement} text="Bank statement (3 months) uploaded (PDF)" />
              <ChecklistRow ok={hasIncomeProof} text="Payslip or business proof uploaded (PDF)" />
            </div>

            {!canSubmit ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-700">
                <p className="font-semibold mb-1">To enable submit:</p>
                <ul className="list-disc pl-5 space-y-1">
                  {missingReasons.slice(0, 4).map((r) => (
                    <li key={r}>{r}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
                All set. You can submit KYC now.
              </div>
            )}
          </section>

          {/* Timeline + tips */}
          <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
            <h3 className="text-base font-semibold text-slate-800">KYC steps</h3>

            <div className="space-y-2 text-sm text-slate-700">
              <p>{hasAllRequiredDocs ? "✓" : "•"} Upload docs</p>
              <p>{kycStatus !== "not_started" && kycStatus !== "rejected" ? "✓" : "•"} Submit KYC</p>
              <p>{kycStatus === "pending" || kycStatus === "verified" ? "✓" : "•"} Under review</p>
              <p>
                {kycStatus === "verified"
                  ? "✓ Approved"
                  : kycStatus === "rejected"
                  ? "✓ Rejected"
                  : "• Decision"}
              </p>
            </div>

            <div className="rounded-xl border bg-slate-50 p-4 text-sm text-slate-700 space-y-2">
              <p className="text-sm font-semibold text-slate-800">Tips for faster approval</p>
              <ul className="text-sm list-disc pl-5 space-y-1 text-slate-600">
                <li>Use clear PDF scans (not blurry photos).</li>
                <li>Make sure names match your profile.</li>
                <li>Upload full bank statement pages.</li>
              </ul>
            </div>
          </section>

          {/* Sticky submit action panel (desktop sticky) */}
          <section className="lg:sticky lg:top-4 space-y-3">
            <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
              <h3 className="text-base font-semibold text-slate-800">Submit KYC</h3>

              <button
                type="button"
                onClick={submitKyc}
                disabled={!canSubmit || submitting}
                className="w-full rounded-xl bg-slate-900 text-white px-4 py-3 text-sm font-semibold hover:bg-slate-800 transition disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#B38E46]"
              >
                {submitting
                  ? "Submitting..."
                  : kycStatus === "rejected"
                  ? "Resubmit KYC"
                  : "Submit KYC"}
              </button>

              {!canSubmit ? (
                <p className="text-xs text-amber-700">
                  {missingReasons[0] || "Complete requirements before submitting."}
                </p>
              ) : (
                <p className="text-xs text-slate-600">Ready to submit. We’ll review your documents.</p>
              )}

              <div className="rounded-xl border bg-slate-50 p-4 text-xs text-slate-600">
                We use your info only for account and loan processing.
              </div>

              {kycStatus === "pending" ? (
                <p className="text-sm text-amber-600">Your KYC is under review.</p>
              ) : null}
              {kycStatus === "verified" ? (
                <p className="text-sm text-emerald-600">You can now apply for a loan.</p>
              ) : null}
            </div>

            <div className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
              <p className="text-sm text-slate-600">Need help with document upload?</p>
              <div className="flex gap-4 text-sm">
                <Link to="/contact-officer" className="hover:underline">
                  Contact Officer
                </Link>
                <Link to="/help-center" className="hover:underline">
                  Help Center
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>

      {/* Mobile help footer */}
      <section className="pt-2 border-t flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <p className="text-sm text-slate-600">Having trouble? We can help.</p>
        <div className="flex gap-4 text-sm">
          <Link to="/contact-officer" className="hover:underline">
            Contact Officer
          </Link>
          <Link to="/help-center" className="hover:underline">
            Help Center
          </Link>
        </div>
      </section>
    </div>
  );
}