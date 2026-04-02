import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, PhoneCall, ShieldCheck } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";

const BRAND_NAVY = "#002D5B";

const PUBLIC_LOAN_OPTIONS = [
  { slug: "home-loan", name: "Home Loan" },
  { slug: "education-loan", name: "Education Loan" },
  { slug: "vehicle-loan", name: "Vehicle Loan" },
  { slug: "business-loan", name: "Business Loan" },
  { slug: "agriculture-loan", name: "Agriculture Loan" },
  { slug: "personal-loan", name: "Personal Loan" },
];

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const MARITAL_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

const HOUSING_OPTIONS = [
  { value: "tenant", label: "Tenant" },
  { value: "home_owner", label: "Home Owner" },
];

const EMPLOYMENT_OPTIONS = [
  { value: "employed", label: "Employed" },
  { value: "not_employed", label: "Not Employed" },
];

const BORROWER_OPTIONS = [
  { value: "first_time", label: "First Time Borrower" },
  { value: "repeat", label: "Repeat Borrower" },
];

function ChoiceGrid({ label, name, value, onChange, options, hint }) {
  return (
    <div className="space-y-2.5">
      <div>
        <p className="text-sm font-medium text-slate-800">{label}</p>
        {hint ? <p className="mt-1 text-xs text-slate-500">{hint}</p> : null}
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(name, option.value)}
              className={[
                "flex min-h-12 items-center justify-between rounded-xl border px-4 py-3 text-left text-sm font-medium transition sm:min-h-11",
                active
                  ? "border-slate-900 bg-slate-900 text-white shadow-sm"
                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
              ].join(" ")}
            >
              <span>{option.label}</span>
              {active ? <CheckCircle2 size={16} className="shrink-0" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function LoanInquiryPage() {
  const [searchParams] = useSearchParams();
  const initialSlug = searchParams.get("product") || "";

  const [loanProducts, setLoanProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState({
    fullName: "",
    address: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    gender: "",
    maritalStatus: "",
    dependants: "",
    housingStatus: "",
    employmentStatus: "",
    borrowerType: "",
    loanProductSlug: initialSlug,
    requestedAmount: "",
    preferredTenureMonths: "",
    description: "",
  });

  const mergedLoanOptions = useMemo(
    () => [
      ...PUBLIC_LOAN_OPTIONS,
      ...loanProducts
        .map((item) => ({
          slug: item.slug,
          name: item.name,
        }))
        .filter(
          (item, index, list) =>
            list.findIndex((entry) => entry.slug === item.slug) === index &&
            !PUBLIC_LOAN_OPTIONS.some((preset) => preset.slug === item.slug)
        ),
    ],
    [loanProducts]
  );

  useEffect(() => {
    let mounted = true;

    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const { data } = await api.get("/loan-products");
        const items = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.data?.items)
          ? data.data.items
          : [];
        if (mounted) setLoanProducts(items);
      } catch {
        if (mounted) setLoanProducts([]);
      } finally {
        if (mounted) setLoadingProducts(false);
      }
    };

    fetchProducts();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!form.loanProductSlug && initialSlug) {
      setForm((prev) => ({ ...prev, loanProductSlug: initialSlug }));
    }
  }, [form.loanProductSlug, initialSlug]);

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      updateField(name, value.replace(/\D/g, "").slice(0, 9));
      return;
    }

    if (name === "requestedAmount") {
      updateField(name, value.replace(/[^\d]/g, ""));
      return;
    }

    updateField(name, value);
  };

  const resetForm = () => {
    setForm({
      fullName: "",
      address: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      gender: "",
      maritalStatus: "",
      dependants: "",
      housingStatus: "",
      employmentStatus: "",
      borrowerType: "",
      loanProductSlug: initialSlug,
      requestedAmount: "",
      preferredTenureMonths: "",
      description: "",
    });
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);

    try {
      await api.post("/inquiries", {
        fullName: form.fullName,
        address: form.address,
        phone: `+265${form.phone}`,
        email: form.email || undefined,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        maritalStatus: form.maritalStatus,
        dependants: Number(form.dependants),
        housingStatus: form.housingStatus,
        employmentStatus: form.employmentStatus,
        borrowerType: form.borrowerType,
        loanProductSlug: form.loanProductSlug,
        loanProductName:
          mergedLoanOptions.find((item) => item.slug === form.loanProductSlug)?.name || "",
        requestedAmount: form.requestedAmount ? Number(form.requestedAmount) : undefined,
        preferredTenureMonths: form.preferredTenureMonths
          ? Number(form.preferredTenureMonths)
          : undefined,
        notes: form.description || undefined,
      });

      setSuccess("Inquiry submitted successfully. Our team will contact you shortly.");
      resetForm();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit inquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="min-h-[70vh] bg-[radial-gradient(circle_at_top_right,rgba(179,142,70,0.09),transparent_46%),linear-gradient(to_bottom_right,#f8fafc,#eef2ff_35%,#e2e8f0)] py-5 sm:py-6 md:py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div
          className="mb-5 rounded-2xl border bg-white/90 px-4 py-3 shadow-sm backdrop-blur sm:px-5 md:mb-8 md:flex md:items-center md:justify-between md:px-6"
          style={{ borderColor: "rgba(0,45,91,0.14)" }}
        >
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <Link
              to="/"
              className="inline-flex min-h-11 items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold transition hover:bg-slate-100"
              style={{ color: BRAND_NAVY }}
            >
              <ArrowLeft size={16} /> Back to Home
            </Link>
            <span className="hidden text-slate-300 md:inline">|</span>
            <span className="hidden items-center gap-2 text-sm text-slate-600 md:inline-flex">
              <ShieldCheck size={15} className="text-emerald-600" />
              Public Loan Inquiry
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600 md:mt-0">
            <span className="inline-flex items-center gap-1">
              <PhoneCall size={14} /> +265 999 000 000
            </span>
          </div>
        </div>

        <div className="space-y-5 sm:space-y-6">
          <div
            className="rounded-[26px] border bg-[linear-gradient(145deg,#052d5e,#0c478b)] px-5 py-6 text-white shadow-xl sm:px-6 sm:py-7 md:px-8"
            style={{ borderColor: "rgba(255,255,255,0.08)" }}
          >
            <span className="inline-flex rounded-full border border-white/20 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-white/80">
              Fast Inquiry Form
            </span>
            <h1 className="mt-4 max-w-3xl text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Start your loan request in a few simple steps
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-200 sm:mt-4 sm:leading-7">
              Fill in the details below and submit your request. The form is designed to be quick,
              clear, and easy to complete on both phone and desktop.
            </p>
          </div>

          <div
            className="rounded-[28px] border bg-white p-4 shadow-sm sm:p-5 md:p-8 xl:p-10"
            style={{ borderColor: "rgba(0,45,91,0.14)" }}
          >
            <div className="max-w-3xl">
              <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">Apply for a Loan</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Complete the form below. Use the quick options where possible to finish faster.
              </p>
            </div>

            {error ? (
              <div className="mt-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            ) : null}

            <form className="mt-6 space-y-6 sm:mt-8 sm:space-y-8" onSubmit={onSubmit}>
              <div className="space-y-6 sm:space-y-8">
                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 md:p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Contact Details
                  </p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="md:col-span-2">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</span>
                      <input
                        required
                        name="fullName"
                        value={form.fullName}
                        onChange={onChange}
                        className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm"
                        placeholder="Your full name"
                      />
                    </label>

                    <label className="md:col-span-2">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Address</span>
                      <input
                        required
                        name="address"
                        value={form.address}
                        onChange={onChange}
                        className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm"
                        placeholder="Your current address"
                      />
                    </label>

                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Phone</span>
                      <div className="flex overflow-hidden rounded-xl border border-slate-300">
                        <span className="inline-flex items-center border-r border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-700">
                          +265
                        </span>
                        <input
                          required
                          name="phone"
                          value={form.phone}
                          onChange={onChange}
                          className="h-12 w-full px-4 text-sm outline-none"
                          placeholder="881234567"
                          inputMode="numeric"
                          maxLength={9}
                        />
                      </div>
                    </label>

                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={onChange}
                        className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm"
                        placeholder="you@example.com"
                      />
                    </label>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 md:p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Personal Details
                  </p>
                  <div className="mt-5 grid gap-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label>
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">Date of Birth</span>
                        <input
                          required
                          type="date"
                          name="dateOfBirth"
                          value={form.dateOfBirth}
                          onChange={onChange}
                          className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm"
                        />
                      </label>

                      <label>
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">
                          No. of Dependants
                        </span>
                        <select
                          required
                          name="dependants"
                          value={form.dependants}
                          onChange={onChange}
                          className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm"
                        >
                          <option value="">Select dependants</option>
                          {Array.from({ length: 11 }, (_, index) => (
                            <option key={index} value={index}>
                              {index === 10 ? "10+" : index}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>

                    <ChoiceGrid
                      label="Gender"
                      name="gender"
                      value={form.gender}
                      onChange={updateField}
                      options={GENDER_OPTIONS}
                    />

                    <ChoiceGrid
                      label="Marital Status"
                      name="maritalStatus"
                      value={form.maritalStatus}
                      onChange={updateField}
                      options={MARITAL_OPTIONS}
                    />

                    <div className="grid gap-5 md:grid-cols-2">
                      <ChoiceGrid
                        label="Are you a tenant or home owner?"
                        name="housingStatus"
                        value={form.housingStatus}
                        onChange={updateField}
                        options={HOUSING_OPTIONS}
                      />

                      <ChoiceGrid
                        label="Are you employed?"
                        name="employmentStatus"
                        value={form.employmentStatus}
                        onChange={updateField}
                        options={EMPLOYMENT_OPTIONS}
                      />
                    </div>

                    <ChoiceGrid
                      label="Borrower Type"
                      name="borrowerType"
                      value={form.borrowerType}
                      onChange={updateField}
                      options={BORROWER_OPTIONS}
                      hint="Choose whether this is your first loan with us or a repeat request."
                    />
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5 md:p-6">
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">
                    Loan Request
                  </p>
                  <div className="mt-5 grid gap-4 md:grid-cols-2">
                    <label className="md:col-span-2">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Loan Type</span>
                      <select
                        required
                        name="loanProductSlug"
                        value={form.loanProductSlug}
                        onChange={onChange}
                        className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm"
                        disabled={loadingProducts}
                      >
                        <option value="">
                          {loadingProducts ? "Loading products..." : "Select loan product"}
                        </option>
                        {mergedLoanOptions.map((item) => (
                          <option key={item.slug} value={item.slug}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Loan Amount</span>
                      <input
                        required
                        name="requestedAmount"
                        value={form.requestedAmount}
                        onChange={onChange}
                        className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm"
                        placeholder="Enter loan amount"
                        inputMode="numeric"
                      />
                    </label>

                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Tenure (Months)</span>
                      <select
                        required
                        name="preferredTenureMonths"
                        value={form.preferredTenureMonths}
                        onChange={onChange}
                        className="h-12 w-full rounded-xl border border-slate-300 px-4 text-sm"
                      >
                        <option value="">Select tenure</option>
                        {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                          <option key={month} value={month}>
                            {month} {month === 1 ? "month" : "months"}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="md:col-span-2">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Description</span>
                      <textarea
                        name="description"
                        value={form.description}
                        onChange={onChange}
                        rows={4}
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm"
                        placeholder="Tell us briefly what type of support you need"
                      />
                    </label>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-sm leading-6 text-slate-600 sm:max-w-[65%]">
                  Once you submit, your inquiry goes directly to our admin team for review.
                </p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
                >
                  {submitting ? "Submitting..." : "Submit Inquiry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
