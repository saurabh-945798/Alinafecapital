import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { api } from "../services/api";

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
    phone: "",
    email: "",
    loanProductSlug: initialSlug,
    monthlyIncome: "",
    requestedAmount: "",
    preferredTenureMonths: "",
    notes: "",
  });

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
        phone: form.phone,
        email: form.email || undefined,
        loanProductSlug: form.loanProductSlug,
        monthlyIncome: form.monthlyIncome ? Number(form.monthlyIncome) : undefined,
        requestedAmount: form.requestedAmount ? Number(form.requestedAmount) : undefined,
        preferredTenureMonths: form.preferredTenureMonths
          ? Number(form.preferredTenureMonths)
          : undefined,
        notes: form.notes || undefined,
      });

      setSuccess("Inquiry submitted. Our team will contact you shortly.");
      setForm({
        fullName: "",
        phone: "",
        email: "",
        loanProductSlug: initialSlug,
        monthlyIncome: "",
        requestedAmount: "",
        preferredTenureMonths: "",
        notes: "",
      });
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to submit inquiry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-2xl border bg-white p-6 md:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Loan request</h1>
        <p className="mt-1 text-sm text-slate-600">
          Share your details and selected loan. Our team will review and contact you.
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

          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Phone</span>
            <input
              required
              name="phone"
              value={form.phone}
              onChange={onChange}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              placeholder="e.g. 881234567"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Email (optional)</span>
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
            <span className="mb-1 block text-sm font-medium text-slate-700">Loan Product</span>
            <select
              required
              name="loanProductSlug"
              value={form.loanProductSlug}
              onChange={onChange}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              disabled={loadingProducts}
            >
              <option value="">{loadingProducts ? "Loading products..." : "Select loan product"}</option>
              {loanProducts.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Monthly Income (MWK)</span>
            <input
              type="number"
              min="0"
              name="monthlyIncome"
              value={form.monthlyIncome}
              onChange={onChange}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              placeholder="Optional"
            />
          </label>

          <label>
            <span className="mb-1 block text-sm font-medium text-slate-700">Requested Amount (MWK)</span>
            <input
              type="number"
              min="0"
              name="requestedAmount"
              value={form.requestedAmount}
              onChange={onChange}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              placeholder="Optional"
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Preferred Tenure (months)</span>
            <input
              type="number"
              min="1"
              name="preferredTenureMonths"
              value={form.preferredTenureMonths}
              onChange={onChange}
              className="h-10 w-full rounded-lg border border-slate-300 px-3 text-sm"
              placeholder="Optional"
            />
          </label>

          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium text-slate-700">Notes</span>
            <textarea
              rows={4}
              name="notes"
              value={form.notes}
              onChange={onChange}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              placeholder="Any extra information for our team"
            />
          </label>

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
    </section>
  );
}

