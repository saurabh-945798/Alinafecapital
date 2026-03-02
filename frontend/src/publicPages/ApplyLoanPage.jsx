import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, CircleHelp, PhoneCall, ShieldCheck } from "lucide-react";
import { api } from "../services/api";
import { getKycGate } from "../utils/kycGate";
import { useLoanProducts } from "../hooks/useLoanProducts";

const BRAND_NAVY = "#002D5B";

const ApplyLoanPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loanProducts, loading: productsLoading, error: productsError } = useLoanProducts();
  const defaultProductSlug = loanProducts[0]?.slug || "";
  const [gateChecking, setGateChecking] = useState(true);

  const [formData, setFormData] = useState({
    loanProductSlug: "",
    fullName: "",
    phoneNumber: "",
    email: "",
    monthlyIncome: "",
    loanAmount: "",
    tenureMonths: "",
    employmentType: "Government Employee",
  });
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const selected = useMemo(() => {
    const productParam = searchParams.get("product") || "";
    const productNameParam = searchParams.get("productName") || "";

    const fromSlug = loanProducts.find((item) => item.slug === productParam);
    const fromName = loanProducts.find(
      (item) => item.loanName.toLowerCase() === productNameParam.toLowerCase()
    );
    const matchedProduct = fromSlug || fromName;

    return {
      product: matchedProduct?.loanName || productNameParam || productParam || "General Loan",
      slug: matchedProduct?.slug || "",
      category: matchedProduct?.category || searchParams.get("category") || "General",
      amountRange:
        matchedProduct?.amountRange || searchParams.get("amountRange") || "Subject to eligibility",
      repaymentPeriod:
        matchedProduct?.repaymentPeriod || searchParams.get("repaymentPeriod") || "As per product policy",
      amount: searchParams.get("amount") || "",
      term: searchParams.get("term") || "",
      interestType: searchParams.get("interestType") || "",
      monthlyRate: searchParams.get("monthlyRate") || "",
      processingFee: searchParams.get("processingFee") || "",
      monthlyEmi: searchParams.get("monthlyEmi") || "",
      totalRepayment: searchParams.get("totalRepayment") || "",
      totalInterest: searchParams.get("totalInterest") || "",
      individualCategory: searchParams.get("individualCategory") || "",
    };
  }, [searchParams, loanProducts]);

  useEffect(() => {
    let active = true;

    const enforceApplyGate = async () => {
      const token = typeof window !== "undefined" ? window.localStorage.getItem("token") : "";
      const queryString = searchParams.toString();
      const nextPath = queryString ? `/apply?${queryString}` : "/apply";

      if (!token) {
        navigate(`/login?next=${encodeURIComponent(nextPath)}`, { replace: true });
        return;
      }

      try {
        const { data } = await api.get("/profile/me");
        const profile = data?.item ?? data?.data ?? null;
        const gate = getKycGate(profile);

        if (active) {
          setFormData((prev) => ({
            ...prev,
            fullName: prev.fullName || profile?.fullName || "",
            phoneNumber: prev.phoneNumber || String(profile?.phone || "").replace(/^\+265/, ""),
            email: prev.email || profile?.email || "",
          }));
        }

        if (!gate.canApply) {
          navigate(`/dashboard?kyc=required&next=${encodeURIComponent(nextPath)}`, {
            replace: true,
          });
          return;
        }
      } catch {
        navigate("/dashboard?kyc=required", { replace: true });
        return;
      } finally {
        if (active) setGateChecking(false);
      }
    };

    enforceApplyGate();
    return () => {
      active = false;
    };
  }, [navigate, searchParams]);

  useEffect(() => {
    setFormData((prev) => ({
      ...prev,
      loanProductSlug: prev.loanProductSlug || selected.slug || defaultProductSlug,
      loanAmount: prev.loanAmount || selected.amount || "",
      tenureMonths: prev.tenureMonths || selected.term || "",
    }));
  }, [selected.slug, selected.term, selected.amount, defaultProductSlug]);

  const selectedLoanProduct = useMemo(
    () => loanProducts.find((item) => item.slug === formData.loanProductSlug),
    [formData.loanProductSlug]
  );

  const tenureOptions = useMemo(() => {
    if (!selectedLoanProduct) return [];
    const minTenure = Number(selectedLoanProduct.minTenureMonths || 1);
    const maxTenure = Number(selectedLoanProduct.maxTenureMonths || minTenure);
    const list = [];
    for (let m = minTenure; m <= maxTenure && list.length < 60; m += 1) {
      list.push(m);
    }
    return list;
  }, [selectedLoanProduct]);

  useEffect(() => {
    if (!selectedLoanProduct) return;

    const minAmount = Number(selectedLoanProduct.minAmount || 0);
    const maxAmount = Number(selectedLoanProduct.maxAmount || minAmount);
    const minTenure = Number(selectedLoanProduct.minTenureMonths || 1);
    const maxTenure = Number(selectedLoanProduct.maxTenureMonths || minTenure);

    setFormData((prev) => {
      let nextAmount = prev.loanAmount;
      const amountNum = Number(prev.loanAmount);
      if (!Number.isFinite(amountNum) || prev.loanAmount === "") {
        nextAmount = String(minAmount);
      } else if (amountNum < minAmount) {
        nextAmount = String(minAmount);
      } else if (amountNum > maxAmount) {
        nextAmount = String(maxAmount);
      }

      let nextTenure = prev.tenureMonths;
      const tenureNum = Number(prev.tenureMonths);
      if (!Number.isFinite(tenureNum) || prev.tenureMonths === "") {
        nextTenure = String(minTenure);
      } else if (tenureNum < minTenure) {
        nextTenure = String(minTenure);
      } else if (tenureNum > maxTenure) {
        nextTenure = String(maxTenure);
      }

      return {
        ...prev,
        loanAmount: nextAmount,
        tenureMonths: nextTenure,
      };
    });
  }, [selectedLoanProduct]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phoneNumber") {
      const local = value.replace(/\D/g, "").slice(0, 9);
      setFormData((prev) => ({ ...prev, phoneNumber: local }));
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const submitApplication = async (e) => {
    e.preventDefault();
    setSubmitError("");
    setSubmitLoading(true);

    try {
      const rawUser = typeof window !== "undefined" ? window.localStorage.getItem("user") : "";
      let currentUser = null;
      if (rawUser) {
        try {
          currentUser = JSON.parse(rawUser);
        } catch {
          currentUser = null;
        }
      }
      const payload = {
        productSlug: formData.loanProductSlug,
        fullName: formData.fullName.trim(),
        phone: `+265${formData.phoneNumber.replace(/\D/g, "")}`,
        email: (formData.email || currentUser?.email || "").trim() || undefined,
        monthlyIncome: Number(formData.monthlyIncome),
        amount: Number(formData.loanAmount),
        tenureMonths: Number(formData.tenureMonths),
      };

      if (!payload.productSlug || !payload.fullName || !payload.phone) {
        throw new Error("Please fill all required fields.");
      }
      if (!/^\+265\d{9}$/.test(payload.phone)) {
        throw new Error("Phone number must be a valid Malawi number.");
      }
      if (!Number.isFinite(payload.monthlyIncome) || payload.monthlyIncome < 0) {
        throw new Error("Monthly income must be a valid number.");
      }
      if (!Number.isFinite(payload.amount) || payload.amount <= 0) {
        throw new Error("Loan amount must be greater than zero.");
      }
      if (!Number.isInteger(payload.tenureMonths) || payload.tenureMonths < 1) {
        throw new Error("Tenure must be at least 1 month.");
      }

      if (selectedLoanProduct) {
        const minAmount = Number(selectedLoanProduct.minAmount || 0);
        const maxAmount = Number(selectedLoanProduct.maxAmount || minAmount);
        const minTenure = Number(selectedLoanProduct.minTenureMonths || 1);
        const maxTenure = Number(selectedLoanProduct.maxTenureMonths || minTenure);

        if (payload.amount < minAmount || payload.amount > maxAmount) {
          throw new Error(`Loan amount must be between ${minAmount} and ${maxAmount}.`);
        }
        if (payload.tenureMonths < minTenure || payload.tenureMonths > maxTenure) {
          throw new Error(`Tenure must be between ${minTenure} and ${maxTenure} months.`);
        }
      }

      const { data } = await api.post("/applications", payload);
      const createdId = data?.data?.applicationId || data?.data?._id || "";
      const next = createdId
        ? `/dashboard/my-applications?created=${encodeURIComponent(createdId)}`
        : "/dashboard/my-applications";
      navigate(next, { replace: true });
    } catch (err) {
      if (err?.response?.status === 401) {
        const queryString = searchParams.toString();
        const nextPath = queryString ? `/apply?${queryString}` : "/apply";
        navigate(`/login?next=${encodeURIComponent(nextPath)}`, { replace: true });
        return;
      }
      setSubmitError(
        err?.response?.data?.message ||
          err?.message ||
          "Could not submit application. Please try again."
      );
    } finally {
      setSubmitLoading(false);
    }
  };

  if (gateChecking) {
    return (
      <section className="min-h-[70vh] bg-gradient-to-br from-white to-gray-50 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <p className="text-sm text-gray-600">Checking your eligibility to apply...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="min-h-[70vh] bg-[radial-gradient(circle_at_top_right,rgba(179,142,70,0.09),transparent_46%),linear-gradient(to_bottom_right,#f8fafc,#eef2ff_35%,#e2e8f0)] py-8 md:py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
              Secure Loan Application
            </span>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-600 md:mt-0">
            <span className="inline-flex items-center gap-1">
              <PhoneCall size={14} /> +265 999 000 000
            </span>
            <span className="inline-flex items-center gap-1">
              <CircleHelp size={14} /> Need help?
            </span>
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-[380px_1fr] xl:gap-7">
          <aside className="space-y-4 lg:sticky lg:top-8 lg:h-fit">
            <div
              className="overflow-hidden rounded-2xl border bg-white shadow-sm"
              style={{ borderColor: "rgba(0,45,91,0.14)" }}
            >
              <div className="bg-gradient-to-r from-slate-900 via-[#002D5B] to-slate-800 px-6 py-5 text-white">
                <h1 className="text-2xl font-bold">Loan Summary</h1>
                <p className="mt-1 text-sm text-slate-100/90">
                  Confirm your product and terms before submitting.
                </p>
              </div>

              <div className="space-y-4 p-6 text-sm">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <p className="text-slate-500">Selected Product</p>
                  <p className="mt-1 break-all text-base font-semibold text-slate-800">
                    {selectedLoanProduct?.loanName || selected.product}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Category</p>
                    <p className="mt-1 font-semibold text-slate-800">{selected.category}</p>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Repayment</p>
                    <p className="mt-1 font-semibold text-slate-800">{selected.repaymentPeriod}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-500">Amount Range</p>
                  <p className="mt-1 font-semibold text-slate-800">{selected.amountRange}</p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
              Your profile and KYC are verified. You can submit this application securely.
            </div>
          </aside>

          <form
            onSubmit={submitApplication}
            className="rounded-2xl border bg-white p-5 shadow-sm md:p-7"
            style={{ borderColor: "rgba(0,45,91,0.14)" }}
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <h2 className="text-2xl font-bold" style={{ color: BRAND_NAVY }}>
                  Apply Now
                </h2>
                <p className="mt-2 text-sm text-slate-600">
                  Review the details below and submit your loan request.
                </p>
              </div>
              <span className="rounded-full border border-slate-300 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                Secure Form
              </span>
            </div>

            {productsError ? (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-5 text-rose-700">
                {productsError}
              </p>
            ) : null}
            {submitError ? (
              <p className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm leading-5 text-rose-700">
                {submitError}
              </p>
            ) : null}

            <div className="mt-6 space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 md:p-5">
                <p className="text-sm font-semibold text-slate-800">Loan Setup</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Loan Product
                    <select
                      name="loanProductSlug"
                      value={formData.loanProductSlug}
                      onChange={handleChange}
                      required
                      disabled={productsLoading || loanProducts.length === 0}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#002D5B] focus:ring-2 focus:ring-[#002D5B]/20 disabled:bg-slate-100"
                    >
                      {productsLoading ? <option value="">Loading products...</option> : null}
                      {!productsLoading && loanProducts.length === 0 ? (
                        <option value="">No active products available</option>
                      ) : null}
                      {loanProducts.map((product) => (
                        <option key={product.slug} value={product.slug}>
                          {product.loanName}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Tenure (Months)
                    <select
                      name="tenureMonths"
                      value={formData.tenureMonths}
                      onChange={handleChange}
                      required
                      disabled={!selectedLoanProduct}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#002D5B] focus:ring-2 focus:ring-[#002D5B]/20 disabled:bg-slate-100"
                    >
                      {!selectedLoanProduct ? <option value="">Select product first</option> : null}
                      {tenureOptions.map((month) => (
                        <option key={month} value={month}>
                          {month} month{month > 1 ? "s" : ""}
                        </option>
                      ))}
                    </select>
                    {selectedLoanProduct ? (
                      <p className="mt-1 pl-0.5 text-xs leading-5 text-slate-500">
                        Allowed: {selectedLoanProduct.minTenureMonths} - {selectedLoanProduct.maxTenureMonths} months
                      </p>
                    ) : null}
                  </label>

                  <label className="text-sm font-medium text-slate-700 md:col-span-2">
                    Loan Amount (MWK)
                    <input
                      type="number"
                      name="loanAmount"
                      value={formData.loanAmount}
                      onChange={handleChange}
                      min={selectedLoanProduct?.minAmount ?? 0}
                      max={selectedLoanProduct?.maxAmount ?? undefined}
                      required
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#002D5B] focus:ring-2 focus:ring-[#002D5B]/20"
                    />
                    {selectedLoanProduct ? (
                      <p className="mt-1 pl-0.5 text-xs leading-5 text-slate-500">
                        Allowed: MWK {Number(selectedLoanProduct.minAmount || 0).toLocaleString()} - MWK{" "}
                        {Number(selectedLoanProduct.maxAmount || 0).toLocaleString()}
                      </p>
                    ) : null}
                  </label>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4 md:p-5">
                <p className="text-sm font-semibold text-slate-800">Applicant Details (Verified)</p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="text-sm font-medium text-slate-700">
                    Full Name
                    <input
                      type="text"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      required
                      readOnly
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-slate-50 px-4 py-3 text-gray-700 outline-none"
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Email Address
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      readOnly
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-slate-50 px-4 py-3 text-gray-700 outline-none"
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Phone Number
                    <div className="mt-1 flex overflow-hidden rounded-lg border border-gray-300">
                      <span className="inline-flex items-center border-r border-gray-300 bg-gray-50 px-3 text-sm font-semibold text-gray-700">
                        +265
                      </span>
                      <input
                        type="tel"
                        name="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={handleChange}
                        placeholder="881234567"
                        maxLength={9}
                        inputMode="numeric"
                        required
                        readOnly
                        className="w-full bg-slate-50 px-4 py-3 text-gray-700 outline-none"
                      />
                    </div>
                  </label>

                  <label className="text-sm font-medium text-slate-700">
                    Monthly Income (MWK)
                    <input
                      type="number"
                      name="monthlyIncome"
                      value={formData.monthlyIncome}
                      onChange={handleChange}
                      required
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#002D5B] focus:ring-2 focus:ring-[#002D5B]/20"
                    />
                  </label>

                  <label className="text-sm font-medium text-slate-700 md:col-span-2">
                    Employment Type
                    <select
                      name="employmentType"
                      value={formData.employmentType}
                      onChange={handleChange}
                      className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-[#002D5B] focus:ring-2 focus:ring-[#002D5B]/20"
                    >
                      <option>Government Employee</option>
                      <option>Private Company Employee</option>
                      <option>Self-Employed</option>
                      <option>Farmer</option>
                    </select>
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-600">
              By submitting, you confirm that the provided information is accurate and agree to the loan review process.
            </div>

            <button
              type="submit"
              disabled={submitLoading || productsLoading || loanProducts.length === 0}
              className="mt-5 w-full rounded-xl bg-gradient-to-r from-[#002D5B] to-[#0a3f75] px-6 py-3 text-white font-semibold shadow-sm transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#002D5B]/35 focus-visible:ring-offset-2 disabled:opacity-60"
            >
              {submitLoading ? "Submitting..." : "Submit Application"}
            </button>
          </form>
        </div>
      </div>
    </section>
  );
};

export default ApplyLoanPage;
export { ApplyLoanPage };
