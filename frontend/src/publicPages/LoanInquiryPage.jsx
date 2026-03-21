import { useEffect, useState } from "react";
import { ArrowLeft, PhoneCall, ShieldCheck } from "lucide-react";
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
    loanProductSlug: initialSlug,
    requestedAmount: "",
    preferredTenureMonths: "",
    description: "",
  });

  const mergedLoanOptions = [
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
  ];

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
      setForm((p) => ({ ...p, loanProductSlug: initialSlug }));
    }
  }, [initialSlug, form.loanProductSlug]);

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") {
      const digits = value.replace(/\D/g, "").slice(0, 9);
      setForm((p) => ({ ...p, phone: digits }));
      return;
    }
    setForm((p) => ({ ...p, [name]: value }));
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
      setForm({
        fullName: "",
        address: "",
        phone: "",
        email: "",
        loanProductSlug: initialSlug,
        requestedAmount: "",
        preferredTenureMonths: "",
        description: "",
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit inquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="min-h-[70vh] bg-[radial-gradient(circle_at_top_right,rgba(179,142,70,0.09),transparent_46%),linear-gradient(to_bottom_right,#f8fafc,#eef2ff_35%,#e2e8f0)] py-8 md:py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div
          className="mb-6 rounded-2xl border bg-white/90 p-4 shadow-sm backdrop-blur md:mb-8 md:flex md:items-center md:justify-between md:px-5"
          style={{ borderColor: "rgba(0,45,91,0.14)" }}
        >
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-lg px-2 py-1 text-sm font-semibold transition hover:bg-slate-100"
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

        <div className="rounded-2xl border bg-white p-6 shadow-sm md:p-8" style={{ borderColor: "rgba(0,45,91,0.14)" }}>
          <h1 className="text-2xl font-bold text-slate-900">Apply for a Loan</h1>
          <p className="mt-1 text-sm text-slate-600">
            Fill this simple form. Our team will review your request and contact you.
          </p>

        {error ? (
          <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </div>
        ) : null}
        {success ? (
          <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            {success}
          </div>
        ) : null}

          <form className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2" onSubmit={onSubmit}>
            <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Full Name</span>
            <input
              required
              name="fullName"
              value={form.fullName}
              onChange={onChange}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              placeholder="Your full name"
            />
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">Address</span>
              <input
                required
                name="address"
                value={form.address}
                onChange={onChange}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                placeholder="Your current address"
              />
            </label>

            <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Phone</span>
            <div className="flex overflow-hidden rounded-lg border border-slate-300">
              <span className="inline-flex items-center border-r border-slate-300 bg-slate-50 px-3 text-sm font-semibold text-slate-700">
                +265
              </span>
              <input
                required
                name="phone"
                value={form.phone}
                onChange={onChange}
                className="h-10 w-full px-3 text-sm outline-none"
                placeholder="881234567"
                inputMode="numeric"
                maxLength={9}
              />
            </div>
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Email</span>
            <input
              name="email"
              type="email"
              value={form.email}
              onChange={onChange}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              placeholder="you@example.com"
            />
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">Loan Type</span>
            <select
              required
              name="loanProductSlug"
              value={form.loanProductSlug}
              onChange={onChange}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              disabled={loadingProducts}
            >
                <option value="">{loadingProducts ? "Loading products..." : "Select loan product"}</option>
              {mergedLoanOptions.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Loan Amount</span>
              <input
                required
                name="requestedAmount"
                type="number"
                min="1"
                value={form.requestedAmount}
                onChange={onChange}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                placeholder="Enter loan amount"
                inputMode="numeric"
              />
            </label>

            <label>
              <span className="mb-1 block text-sm font-medium text-slate-700">Tenure (Months)</span>
              <input
                required
                name="preferredTenureMonths"
                type="number"
                min="1"
                value={form.preferredTenureMonths}
                onChange={onChange}
                className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
                placeholder="e.g. 12"
                inputMode="numeric"
              />
            </label>

            <label className="md:col-span-2">
              <span className="mb-1 block text-sm font-medium text-slate-700">Description</span>
              <textarea
                name="description"
                value={form.description}
                onChange={onChange}
                rows={4}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Tell us briefly what type of support you need"
              />
            </label>

            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
              Once you submit, your inquiry will go directly to our admin team for review.
            </div>

            <div className="md:col-span-2">
              <button
                type="submit"
                disabled={submitting}
                className="rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                {submitting ? "Submitting..." : "Submit Inquiry"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
