import { useNavigate } from "react-router-dom";
import { api } from "../services/api";
import { guardStartApplication } from "../utils/applyGuard";

export default function DashboardApplyLoanPage() {
  const navigate = useNavigate();

  const handleContinue = () => {
    guardStartApplication({ navigate, api });
  };

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-50 via-white to-sky-50 p-6 shadow-[0_8px_20px_rgba(15,23,42,0.06)]">
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-emerald-300/25 blur-3xl" />

        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
            Loan Application
          </p>
          <h1 className="mt-2 text-2xl font-semibold text-slate-900">
            Apply for a New Loan
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-600">
            Continue to the secure loan application form. Your profile and KYC
            details help speed up review.
          </p>
        </div>
      </section>

      <section className="grid gap-5 md:grid-cols-2">
        <article className="rounded-2xl border bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
          <h2 className="text-base font-semibold text-slate-900">Before You Start</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-600">
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
              Keep your National ID and address proof ready.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
              Use active phone number for updates.
            </li>
            <li className="flex items-start gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-slate-500" />
              Review requested amount and repayment period carefully.
            </li>
          </ul>
        </article>

        <article className="rounded-2xl border bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
          <h2 className="text-base font-semibold text-slate-900">What Happens Next</h2>
          <div className="mt-3 space-y-3 text-sm text-slate-600">
            <p>1. Fill and submit your application form.</p>
            <p>2. Team reviews your details and documents.</p>
            <p>3. You receive status update and next steps.</p>
          </div>
        </article>
      </section>

      <section className="rounded-2xl border bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-600">
            This opens the main application form at <span className="font-semibold">/apply</span>.
          </p>
          <button
            type="button"
            onClick={handleContinue}
            className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Continue to Loan Application Form
          </button>
        </div>
      </section>
    </div>
  );
}
