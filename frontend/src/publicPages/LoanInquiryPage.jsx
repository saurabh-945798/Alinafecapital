import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  PhoneCall,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";

const BRAND_NAVY = "#002D5B";

const PUBLIC_LOAN_OPTIONS = [
  { slug: "civil-servant-loan", name: "Civil Servant Loan" },
  { slug: "emergency-loan", name: "Emergency Loan" },
  { slug: "statutory-company-loans", name: "Statutory Company Loans" },
  { slug: "private-company-loans", name: "Private company loans" },
  { slug: "business-loan", name: "Business Loan" },
];

const normalizeLoanText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

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

function ChoiceGrid({ label, name, value, onChange, options, hint, columns = 1 }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-baseline gap-1.5 border-b border-slate-200 pb-2">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <span className="text-xs font-medium italic text-orange-500">(Required)</span>
        </div>
        {hint ? <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p> : null}
      </div>

      <div className={["grid gap-3", columns === 2 ? "sm:grid-cols-2" : ""].join(" ").trim()}>
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(name, option.value)}
              className={[
                "flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 text-left text-slate-700 transition",
                active
                  ? "border-slate-900 bg-slate-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border transition",
                  active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-transparent",
                ].join(" ")}
              >
                <Check size={13} strokeWidth={3} />
              </span>
              <span className="text-sm font-medium">{option.label}</span>
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
  const [showSuccessModal, setShowSuccessModal] = useState(false);
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

  const mergedLoanOptions = useMemo(() => {
    const byName = new Map(
      loanProducts.map((item) => [normalizeLoanText(item?.name), item])
    );
    const bySlug = new Map(loanProducts.map((item) => [item?.slug, item]));

    return PUBLIC_LOAN_OPTIONS.map((preset) => {
      const matched =
        bySlug.get(preset.slug) ||
        byName.get(normalizeLoanText(preset.name));

      return {
        slug: matched?.slug || preset.slug,
        name: preset.name,
      };
    });
  }, [loanProducts]);

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

  const validateForm = () => {
    if (form.fullName.trim().length < 2) return "Full name must be at least 2 characters.";
    if (form.address.trim().length < 5) return "Address must be at least 5 characters.";
    if (!form.phone.trim() || form.phone.trim().length !== 9) {
      return "Enter a valid 9-digit phone number.";
    }
    if (!form.email.trim()) return "Email is required.";
    if (!form.dateOfBirth) return "Date of birth is required.";
    if (!form.gender) return "Please select gender.";
    if (!form.maritalStatus) return "Please select marital status.";
    if (form.dependants === "") return "Please select number of dependants.";
    const dependantsValue = Number(form.dependants);
    if (!Number.isInteger(dependantsValue) || dependantsValue < 0 || dependantsValue > 20) {
      return "Dependants must be a whole number between 0 and 20.";
    }
    if (!form.housingStatus) return "Please select housing status.";
    if (!form.employmentStatus) return "Please select employment status.";
    if (!form.borrowerType) return "Please select borrower type.";
    if (!form.loanProductSlug) return "Please select loan type.";
    if (!form.requestedAmount.trim()) return "Loan amount is required.";
    if (Number(form.requestedAmount) <= 0) return "Loan amount must be greater than 0.";
    if (!form.preferredTenureMonths) return "Please select tenure.";
    if (form.description.trim().length < 3) return "Description must be at least 3 characters.";
    return "";
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

    if (name === "dependants") {
      const sanitized = value.replace(/[^\d]/g, "").slice(0, 2);
      updateField(name, sanitized);
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

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);

    try {
      const selectedLoanName =
        mergedLoanOptions.find((item) => item.slug === form.loanProductSlug)?.name || undefined;
      await api.post("/inquiries", {
        fullName: form.fullName,
        address: form.address,
        phone: `+265${form.phone}`,
        email: form.email,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        maritalStatus: form.maritalStatus,
        dependants: Number(form.dependants),
        housingStatus: form.housingStatus,
        employmentStatus: form.employmentStatus,
        borrowerType: form.borrowerType,
        loanProductSlug: form.loanProductSlug,
        ...(selectedLoanName ? { loanProductName: selectedLoanName } : {}),
        requestedAmount: Number(form.requestedAmount),
        preferredTenureMonths: Number(form.preferredTenureMonths),
        notes: form.description.trim(),
      });

      setSuccess("Inquiry submitted successfully. Our team will contact you shortly.");
      setShowSuccessModal(true);
      resetForm();
    } catch (err) {
      const backend = err?.response?.data;
      const firstDetail = Array.isArray(backend?.details) ? backend.details[0] : null;
      const detailMsg =
        firstDetail?.message ||
        (Array.isArray(firstDetail?.errors) && firstDetail.errors[0]?.message) ||
        "";
      setError(detailMsg || backend?.message || "Failed to submit inquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {showSuccessModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-emerald-200 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                    Inquiry Submitted
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">
                    Your loan request has been received
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Close success modal"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-5 text-sm leading-7 text-slate-600">
              We have received your details successfully. Our team will review your request and contact you with the next steps.
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Please keep your phone available. You may receive a follow-up message for KYC and profile completion.
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <section className="min-h-screen bg-[linear-gradient(180deg,#f8fafc_0%,#eef2ff_32%,#ffffff_100%)] py-4 sm:py-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div
          className="mb-4 rounded-[24px] border bg-white/90 px-4 py-4 shadow-sm backdrop-blur sm:px-5 lg:mb-5 lg:px-6"
          style={{ borderColor: "rgba(0,45,91,0.14)" }}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Link
                to="/"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-slate-100"
                style={{ color: BRAND_NAVY }}
              >
                <ArrowLeft size={16} /> Back to Home
              </Link>
              <span className="hidden text-slate-300 lg:inline">|</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                <ShieldCheck size={15} className="text-emerald-600" />
                Public Loan Inquiry
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1">
                <PhoneCall size={14} /> +265 997 031 941
              </span>
            </div>
          </div>
        </div>

        <div>
          <div
            className="rounded-[28px] border bg-white p-4 shadow-sm sm:p-5 lg:p-6"
            style={{ borderColor: "rgba(0,45,91,0.14)" }}
          >
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-[2rem]">
                Apply for a Loan
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Fill in the form below and submit your loan request.
              </p>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            ) : null}

            <form className="mt-5 space-y-5" onSubmit={onSubmit}>
              <div className="grid gap-5 xl:grid-cols-2">
                <section className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Contact Information
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="md:col-span-2">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</span>
                      <input
                        required
                        name="fullName"
                        value={form.fullName}
                        onChange={onChange}
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
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
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
                        placeholder="Your current address"
                      />
                    </label>

                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Phone</span>
                      <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white">
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
                        required
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={onChange}
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
                        placeholder="you@example.com"
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Loan Request
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="md:col-span-2">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Loan Type</span>
                      <select
                        required
                        name="loanProductSlug"
                        value={form.loanProductSlug}
                        onChange={onChange}
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
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
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
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
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
                      >
                        <option value="">Select tenure</option>
                        {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                          <option key={month} value={month}>
                            {month} {month === 1 ? "month" : "months"}
                          </option>
                        ))}
                      </select>
                    </label>

                  </div>
                </section>
              </div>

              <section className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Personal Details
                </p>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <label>
                    <span className="mb-1.5 flex items-baseline gap-1.5 border-b border-slate-200 pb-2 text-sm font-semibold text-slate-900">
                      Date of Birth
                      <span className="text-xs font-medium italic text-orange-500">(Required)</span>
                    </span>
                    <input
                      required
                      type="date"
                      name="dateOfBirth"
                      value={form.dateOfBirth}
                      onChange={onChange}
                      className="mt-3 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 flex items-baseline gap-1.5 border-b border-slate-200 pb-2 text-sm font-semibold text-slate-900">
                      No. of Dependants
                      <span className="text-xs font-medium italic text-orange-500">(Required)</span>
                    </span>
                    <input
                      required
                      name="dependants"
                      value={form.dependants}
                      onChange={onChange}
                      inputMode="numeric"
                      className="mt-3 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
                      placeholder="Enter number of dependants"
                    />
                  </label>
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-2">
                  <ChoiceGrid
                    label="Gender"
                    name="gender"
                    value={form.gender}
                    onChange={updateField}
                    options={GENDER_OPTIONS}
                    columns={1}
                  />

                  <ChoiceGrid
                    label="Marital Status"
                    name="maritalStatus"
                    value={form.maritalStatus}
                    onChange={updateField}
                    options={[
                      { value: "single", label: "Single" },
                      { value: "married", label: "Married" },
                      { value: "divorced", label: "Others" },
                    ]}
                    columns={1}
                  />
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-2">
                  <ChoiceGrid
                    label="Housing Status"
                    name="housingStatus"
                    value={form.housingStatus}
                    onChange={updateField}
                    options={HOUSING_OPTIONS}
                    columns={1}
                  />

                  <ChoiceGrid
                    label="Employment Status"
                    name="employmentStatus"
                    value={form.employmentStatus}
                    onChange={updateField}
                    options={[
                      { value: "employed", label: "Yes" },
                      { value: "not_employed", label: "No" },
                    ]}
                    columns={1}
                  />
                </div>

                <div className="mt-5">
                  <ChoiceGrid
                    label="Borrower Type"
                    name="borrowerType"
                    value={form.borrowerType}
                    onChange={updateField}
                    options={BORROWER_OPTIONS}
                    hint="Choose whether this is your first loan with us or a repeat request."
                  />
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Additional Details
                </p>
                <div className="mt-4">
                  <label className="block">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Description</span>
                    <textarea
                      required
                      name="description"
                      value={form.description}
                      onChange={onChange}
                      rows={5}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                      placeholder="Tell us briefly what type of support you need"
                    />
                  </label>
                </div>
              </section>

              <div className="flex flex-col gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  Once you submit, your inquiry goes directly to our admin team for review.
                </p>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
                >
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
