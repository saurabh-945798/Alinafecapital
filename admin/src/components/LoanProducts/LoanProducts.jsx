import { useEffect, useMemo, useState } from "react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { loanProductsApi } from "../../services/api/loanProducts.api";
import { useToast } from "../../context/ToastContext.jsx";

const DEFAULT_FORM = {
  name: "",
  slug: "",
  category: "Private",
  description: "",
  currency: "MWK",
  minAmount: "",
  maxAmount: "",
  minTenureMonths: "",
  maxTenureMonths: "",
  interestType: "reducing",
  interestRateMonthly: "",
  processingFeeType: "percent",
  processingFeeValue: "2.5",
  adminFeeType: "percent",
  adminFeeValue: "2.5",
  overduePenaltyRatePercent: "15",
  loanAdministrationFeeMonthly: "0",
  status: "active",
  featured: false,
};

const toNumber = (value, fallback = 0) => {
  const n = Number(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : fallback;
};

const formatAmountField = (value) => {
  if (value === "" || value == null) return "";
  const n = toNumber(value, Number.NaN);
  if (!Number.isFinite(n)) return String(value);
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const unformatAmountField = (value) => String(value ?? "").replace(/,/g, "");

const statusTone = (status) => (status === "active" ? "green" : "gray");

const INPUT_CLASS = "mt-1 h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm font-medium text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-[#002D5B] focus:ring-2 focus:ring-[#002D5B]/10";

const FieldHint = ({ children }) => <p className="mt-1 text-[11px] text-slate-500">{children}</p>;

export default function LoanProductsPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [includeInactive, setIncludeInactive] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitLoading, setSubmitLoading] = useState(false);

  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState(DEFAULT_FORM);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const title = editingId ? "Edit Loan Product" : "Create Loan Product";

  const featuredCount = useMemo(
    () => items.filter((item) => Boolean(item.featured) && item.status === "active").length,
    [items]
  );

  const fetchList = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await loanProductsApi.list({ includeInactive: includeInactive ? "true" : "false" });
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load loan products.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchList();
  }, [includeInactive]);

  const resetForm = () => {
    setEditingId("");
    setForm(DEFAULT_FORM);
    setShowAdvanced(false);
  };

  const handleInput = (event) => {
    const { name, value, type, checked } = event.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleMoneyFocus = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: unformatAmountField(value) }));
  };

  const handleMoneyBlur = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: formatAmountField(value) }));
  };

  const handleEdit = (item) => {
    setEditingId(String(item._id));
    setForm({
      name: item.name || "",
      slug: item.slug || "",
      category: item.category || "Private",
      description: item.description || "",
      currency: item.currency || "MWK",
      minAmount: formatAmountField(item.minAmount ?? ""),
      maxAmount: formatAmountField(item.maxAmount ?? ""),
      minTenureMonths: String(item.minTenureMonths ?? ""),
      maxTenureMonths: String(item.maxTenureMonths ?? ""),
      interestType: item.interestType || "reducing",
      interestRateMonthly: String(item.interestRateMonthly ?? ""),
      processingFeeType: "percent",
      processingFeeValue: "2.5",
      adminFeeType: "percent",
      adminFeeValue: "2.5",
      overduePenaltyRatePercent: "15",
      loanAdministrationFeeMonthly: "0",
      status: item.status || "active",
      featured: Boolean(item.featured),
    });
  };

  const validate = () => {
    if (!form.name.trim()) return "Name is required.";
    if (toNumber(form.maxAmount) < toNumber(form.minAmount)) return "Max amount must be >= min amount.";
    if (toNumber(form.maxTenureMonths) < toNumber(form.minTenureMonths)) {
      return "Max tenure must be >= min tenure.";
    }
    if (featuredCount > 0 && form.featured && !editingId) {
      return "A featured product already exists. Disable featured on other product first.";
    }
    return "";
  };

  const buildPayload = () => ({
    name: form.name.trim(),
    slug: form.slug.trim() || undefined,
    category: form.category,
    description: form.description.trim(),
    currency: form.currency.trim() || "MWK",
    minAmount: toNumber(form.minAmount),
    maxAmount: toNumber(form.maxAmount),
    minTenureMonths: toNumber(form.minTenureMonths),
    maxTenureMonths: toNumber(form.maxTenureMonths),
    interestType: form.interestType,
    interestRateMonthly: toNumber(form.interestRateMonthly),
    processingFeeType: "percent",
    processingFeeValue: 2.5,
    adminFeeType: "percent",
    adminFeeValue: 2.5,
    overduePenaltyRatePercent: 15,
    loanAdministrationFeeMonthly: 0,
    status: form.status,
    featured: Boolean(form.featured),
  });

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      toast.warning(validationError);
      return;
    }

    setSubmitLoading(true);
    try {
      const payload = buildPayload();
      if (editingId) {
        await loanProductsApi.update(editingId, payload);
        toast.success("Loan product updated successfully.");
      } else {
        await loanProductsApi.create(payload);
        toast.success("Loan product created successfully.");
      }
      await fetchList();
      resetForm();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to save loan product.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitLoading(false);
    }
  };

  const toggleStatus = async (item) => {
    setError("");
    try {
      if (item.status === "active") {
        await loanProductsApi.deactivate(item._id);
        toast.success("Loan product deactivated.");
      } else {
        await loanProductsApi.update(item._id, { status: "active" });
        toast.success("Loan product activated.");
      }
      await fetchList();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to update product status.";
      setError(msg);
      toast.error(msg);
    }
  };

  const handleDelete = async (item) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete this loan product?\n\n${item.name}`
    );

    if (!confirmed) return;

    setError("");
    try {
      await loanProductsApi.deactivate(item._id);
      if (editingId && String(item._id) === editingId) {
        resetForm();
      }
      toast.success("Loan product deleted successfully.");
      await fetchList();
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to delete loan product.";
      setError(msg);
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Loan Products</h1>
          <p className="text-sm text-slate-500">Create and manage live products for the public website.</p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={includeInactive}
            onChange={(e) => setIncludeInactive(e.target.checked)}
          />
          Show inactive products
        </label>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      ) : null}

      <form onSubmit={submit} className="space-y-3 rounded-xl border bg-white p-4">
        <h2 className="text-lg font-semibold">{title}</h2>
        <p className="text-sm text-slate-500">Fill the basic product details first, then pricing.</p>

        <div className="rounded-lg border p-3 space-y-3">
          <p className="text-sm font-semibold text-slate-800">1) Basic Info</p>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs text-slate-600">
              Product Name *
              <input
                className={INPUT_CLASS}
                placeholder="e.g. Emergency Salary Loan"
                name="name"
                value={form.name}
                onChange={handleInput}
              />
              <FieldHint>Name shown to customers on website.</FieldHint>
            </label>

            <label className="text-xs text-slate-600">
              Product Code (Slug)
              <input
                className={INPUT_CLASS}
                placeholder="e.g. emergency-salary-loan"
                name="slug"
                value={form.slug}
                onChange={handleInput}
              />
              <FieldHint>URL-safe short code. Leave empty to auto-generate.</FieldHint>
            </label>

            <label className="text-xs text-slate-600">
              Loan Type
              <select
                className={INPUT_CLASS}
                name="category"
                value={form.category}
                onChange={handleInput}
              >
                <option value="Personal">Personal</option>
                <option value="Private">Private</option>
                <option value="Business">Business</option>
                <option value="Agriculture">Agriculture</option>
                <option value="Emergency Loan">Emergency Loan</option>
                <option value="Government">Government</option>
                <option value="Public">Public</option>
                <option value="Education">Education</option>
                <option value="Group">Group</option>
                <option value="Asset Finance">Asset Finance</option>
                <option value="Digital Credit">Digital Credit</option>
                <option value="Other">Other</option>
              </select>
              <FieldHint>Select how this product should appear in frontend tabs.</FieldHint>
            </label>

            <label className="text-xs text-slate-600">
              Currency
              <input
                className={INPUT_CLASS}
                placeholder="MWK"
                name="currency"
                value={form.currency}
                onChange={handleInput}
              />
              <FieldHint>Use MWK for Malawi products.</FieldHint>
            </label>
          </div>

          <label className="block text-xs text-slate-600">
            Short Description
            <textarea
              className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-900 shadow-sm outline-none placeholder:text-slate-400 focus:border-[#002D5B] focus:ring-2 focus:ring-[#002D5B]/10"
              placeholder="Short customer-friendly summary."
              name="description"
              rows={3}
              value={form.description}
              onChange={handleInput}
            />
            <FieldHint>This appears in loan cards and details.</FieldHint>
          </label>
        </div>

        <div className="rounded-lg border p-3 space-y-3">
          <p className="text-sm font-semibold text-slate-800">2) Amount & Tenure Limits</p>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="text-xs text-slate-600">
              Minimum Amount *
              <input
                className={INPUT_CLASS}
                placeholder="50,000.00"
                name="minAmount"
                type="text"
                inputMode="decimal"
                value={form.minAmount}
                onChange={handleInput}
                onFocus={handleMoneyFocus}
                onBlur={handleMoneyBlur}
              />
              <FieldHint>Smallest loan customer can request.</FieldHint>
            </label>

            <label className="text-xs text-slate-600">
              Maximum Amount *
              <input
                className={INPUT_CLASS}
                placeholder="500,000.00"
                name="maxAmount"
                type="text"
                inputMode="decimal"
                value={form.maxAmount}
                onChange={handleInput}
                onFocus={handleMoneyFocus}
                onBlur={handleMoneyBlur}
              />
              <FieldHint>Largest loan allowed for this product.</FieldHint>
            </label>

            <label className="text-xs text-slate-600">
              Min Tenure (months) *
              <input
                className={INPUT_CLASS}
                placeholder="3"
                name="minTenureMonths"
                type="number"
                value={form.minTenureMonths}
                onChange={handleInput}
              />
              <FieldHint>Shortest repayment period.</FieldHint>
            </label>

            <label className="text-xs text-slate-600">
              Max Tenure (months) *
              <input
                className={INPUT_CLASS}
                placeholder="12"
                name="maxTenureMonths"
                type="number"
                value={form.maxTenureMonths}
                onChange={handleInput}
              />
              <FieldHint>Longest repayment period.</FieldHint>
            </label>

          </div>
        </div>

        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-sm font-semibold text-slate-800">3) Website Highlight</p>
          <label className="inline-flex items-center gap-2 text-sm">
            <input type="checkbox" name="featured" checked={form.featured} onChange={handleInput} />
            Mark as featured on website
          </label>
          <FieldHint>Use for one flagship product only (hero/priority display).</FieldHint>
          <div className="max-w-sm">
            <label className="text-xs text-slate-600">
              Status
              <select className={INPUT_CLASS} name="status" value={form.status} onChange={handleInput}>
                <option value="active">active (show on website)</option>
                <option value="inactive">inactive (hide from website)</option>
              </select>
              <FieldHint>Only active products are visible to customers.</FieldHint>
            </label>
          </div>
        </div>

        <div className="rounded-lg border p-3 space-y-3">
          <button
            type="button"
            className="text-sm font-semibold underline"
            onClick={() => setShowAdvanced((v) => !v)}
          >
            {showAdvanced ? "Hide Pricing Settings" : "Show Pricing Settings"}
          </button>

          {showAdvanced ? (
            <>
              <p className="text-sm font-semibold text-slate-800">4) Pricing Settings</p>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-xs text-slate-600">
                  Interest Type
                  <select className={INPUT_CLASS} name="interestType" value={form.interestType} onChange={handleInput}>
                    <option value="reducing">reducing</option>
                    <option value="flat">flat</option>
                  </select>
                  <FieldHint>Reducing is common for formal loans. Flat is simple fixed-style.</FieldHint>
                </label>

                <label className="text-xs text-slate-600">
                  Interest Rate per Month (%) *
                  <input
                    className={INPUT_CLASS}
                    placeholder="5.5"
                    name="interestRateMonthly"
                    type="number"
                    step="0.01"
                    value={form.interestRateMonthly}
                    onChange={handleInput}
                  />
                  <FieldHint>Example: type 5.5 for 5.5% per month.</FieldHint>
                </label>

                <label className="text-xs text-slate-600">
                  Processing Fee (%)
                  <input
                    className={`${INPUT_CLASS} bg-blue-50/60`}
                    name="processingFeeValue"
                    value="2.50"
                    readOnly
                  />
                  <FieldHint>One-time 2.5% charge applied at the beginning of the loan. It does not recur monthly.</FieldHint>
                </label>

                <label className="text-xs text-slate-600">
                  Admin Fee (%)
                  <input
                    className={`${INPUT_CLASS} bg-blue-50/60`}
                    name="adminFeeValue"
                    value="2.50"
                    readOnly
                  />
                  <FieldHint>One-time 2.5% administration charge applied at the beginning of the loan only.</FieldHint>
                </label>

                <label className="text-xs text-slate-600">
                  Overdue Penalty (%)
                  <input
                    className={`${INPUT_CLASS} bg-amber-50/70`}
                    name="overduePenaltyRatePercent"
                    value="15.00"
                    readOnly
                  />
                  <FieldHint>Applied automatically to an installment that remains unpaid after its due date.</FieldHint>
                </label>

                <div className="md:col-span-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs leading-5 text-slate-700">
                  <strong className="text-[#002D5B]">Current fee policy:</strong> Processing Fee 2.5% + Admin Fee 2.5% are charged once at loan commencement. They are not monthly recurring fees. The normal calculator remains interactive for amount and tenure.
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={submitLoading}>
            {submitLoading ? "Saving..." : editingId ? "Update Product" : "Create Product"}
          </Button>
          {editingId ? (
            <Button type="button" variant="outline" onClick={resetForm}>
              Cancel Edit
            </Button>
          ) : null}
        </div>
      </form>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-left">Name</th>
                <th className="px-4 py-3 text-left">Type</th>
                <th className="px-4 py-3 text-left">Slug</th>
                <th className="px-4 py-3 text-left">Range</th>
                <th className="px-4 py-3 text-left">Rate</th>
                <th className="px-4 py-3 text-left">Fees</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-slate-500">
                    Loading products...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-6 text-slate-500">
                    No loan products found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id} className="border-t border-slate-100">
                    <td className="px-4 py-3">
                      <p className="font-semibold">{item.name}</p>
                      {item.featured ? <Badge tone="amber">featured</Badge> : null}
                    </td>
                    <td className="px-4 py-3">{item.category || "Personal"}</td>
                    <td className="px-4 py-3 text-xs">{item.slug}</td>
                    <td className="px-4 py-3">
                      <p>
                        {item.currency} {Number(item.minAmount || 0).toLocaleString("en-US")} - {" "}
                        {Number(item.maxAmount || 0).toLocaleString("en-US")}
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.minTenureMonths} - {item.maxTenureMonths} months
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      {item.interestRateMonthly}% ({item.interestType})
                    </td>
                    <td className="px-4 py-3 text-xs leading-5 text-slate-600">
                      <div>Processing: 2.5% once</div>
                      <div>Admin: 2.5% once</div>
                      <div className="text-amber-700">Overdue: 15%</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={statusTone(item.status)}>{item.status}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleEdit(item)}>
                          Edit
                        </Button>
                        {item.status === "inactive" ? (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => toggleStatus(item)}
                          >
                            Activate
                          </Button>
                        ) : (
                          <Button size="sm" variant="danger" onClick={() => handleDelete(item)}>
                            Delete
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
