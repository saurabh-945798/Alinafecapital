import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone,
  CheckCircle2,
  Share2,
  Download,
  ShieldCheck,
} from "lucide-react";
import {
  LAST_UPDATED,
  EMPLOYMENT_ADJUSTMENTS,
  productPricingConfig,
} from "./productPricingConfig";
import { calculateQuote, clamp, generateSchedule } from "./pricingEngine";
import { api } from "../../services/api";
import { guardStartApplication } from "../../utils/applyGuard";
import { useLoanProducts } from "../../hooks/useLoanProducts";

const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";

const formatMWK = (num) =>
  "MWK " +
  Number(num || 0).toLocaleString("en-MW", {
    maximumFractionDigits: 0,
  });

const trackEvent = (eventName, payload = {}) => {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event: eventName, ...payload });
};

const toMonthlyDecimalRate = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return n > 1 ? n / 100 : n;
};

const buildAllowedTerms = (minTenureMonths, maxTenureMonths) => {
  const min = Math.max(1, Math.floor(Number(minTenureMonths) || 1));
  const max = Math.max(min, Math.floor(Number(maxTenureMonths) || min));
  const terms = [];
  for (let t = min; t <= max; t += 1) {
    terms.push(t);
    if (terms.length >= 60) break;
  }
  return terms.length ? terms : [min];
};

const buildDynamicPricingConfig = (product) => {
  const raw = product?.raw || {};
  const baseMonthlyRate = toMonthlyDecimalRate(raw.interestRateMonthly);
  const processingFeeRate =
    raw.processingFeeType === "percent" ? toMonthlyDecimalRate(raw.processingFeeValue) : 0;
  const interestType = raw.interestType === "flat" ? "flat" : "reducing";
  const rateType = baseMonthlyRate <= 0 && processingFeeRate > 0 ? "fee_only" : interestType;

  return {
    minAmount: Number(raw.minAmount || 0),
    maxAmount: Number(raw.maxAmount || 0),
    allowedTerms: buildAllowedTerms(raw.minTenureMonths, raw.maxTenureMonths),
    rateType,
    baseMonthlyRate,
    processingFeeRate,
    repaymentStyle: `${raw.minTenureMonths || 1}-${raw.maxTenureMonths || 1} months`,
    assumptions: "Estimate based on current product setup. Final offer may vary after review.",
  };
};

const RepaymentCalculator = () => {
  const navigate = useNavigate();
  const { loanProducts: dynamicLoanProducts } = useLoanProducts();
  const [selectedProductSlug, setSelectedProductSlug] = useState(() => {
    if (typeof window === "undefined") return "";
    const product = new URLSearchParams(window.location.search).get("product") || "";
    return product;
  });
  const [amountInput, setAmountInput] = useState("");
  const [amountError, setAmountError] = useState("");
  const [term, setTerm] = useState(12);
  const [individualCategory, setIndividualCategory] = useState("government");
  const [processingFeeEnabled, setProcessingFeeEnabled] = useState(true);
  const [shareMessage, setShareMessage] = useState("");

  const productOptions = useMemo(
    () => dynamicLoanProducts.filter((p) => Boolean(p.slug)),
    [dynamicLoanProducts]
  );

  const pricingBySlug = useMemo(() => {
    const merged = { ...productPricingConfig };
    productOptions.forEach((product) => {
      if (!merged[product.slug]) {
        merged[product.slug] = buildDynamicPricingConfig(product);
      }
    });
    return merged;
  }, [productOptions]);

  const activeProduct = useMemo(
    () => productOptions.find((p) => p.slug === selectedProductSlug) || null,
    [productOptions, selectedProductSlug]
  );

  useEffect(() => {
    if (!selectedProductSlug && productOptions.length > 0) {
      setSelectedProductSlug(productOptions[0].slug);
    }
  }, [selectedProductSlug, productOptions]);

  const activePricing = activeProduct ? pricingBySlug[activeProduct.slug] : null;
  const allowedTerms = activePricing?.allowedTerms || [];

  useEffect(() => {
    if (!activePricing) {
      setAmountInput("");
      setAmountError("");
      return;
    }

    const defaultAmount = Math.round((activePricing.minAmount + activePricing.maxAmount) / 2);
    setAmountInput(String(defaultAmount));
    setAmountError("");
    setTerm(activePricing.allowedTerms[0]);
  }, [activePricing]);

  const validateAmount = (rawValue) => {
    if (!activePricing) return "Select a loan product first.";
    if (rawValue === "") return "Loan amount is required.";
    const num = Number(rawValue);
    if (!Number.isFinite(num)) return "Enter a valid numeric amount.";
    if (num < activePricing.minAmount)
      return `Minimum amount is ${formatMWK(activePricing.minAmount)}.`;
    if (num > activePricing.maxAmount)
      return `Maximum amount is ${formatMWK(activePricing.maxAmount)}.`;
    return "";
  };

  const amountNumber = Number(amountInput);
  const safeAmount =
    activePricing && Number.isFinite(amountNumber) && amountInput !== ""
      ? clamp(amountNumber, activePricing.minAmount, activePricing.maxAmount)
      : 0;

  const categorySettings = EMPLOYMENT_ADJUSTMENTS[individualCategory];

  const effectiveRate = useMemo(() => {
    if (!activePricing) return 0;
    if (activePricing.rateType === "fee_only") return 0;
    return Math.max(0, activePricing.baseMonthlyRate + categorySettings.rateDelta);
  }, [activePricing, categorySettings.rateDelta]);

  useEffect(() => {
    if (!activePricing) return;
    if (!allowedTerms.includes(term)) {
      setTerm(allowedTerms[0]);
    }
  }, [allowedTerms, term, activePricing]);

  const quote = useMemo(() => {
    if (!activePricing || !safeAmount || amountError) {
      return {
        emi: 0,
        totalPayment: 0,
        totalInterest: 0,
        processingFee: 0,
        totalWithFees: 0,
      };
    }

    return calculateQuote({
      principal: safeAmount,
      months: term,
      rateType: activePricing.rateType,
      monthlyRate: effectiveRate,
      processingFeeEnabled,
      processingFeeRate: activePricing.processingFeeRate,
    });
  }, [activePricing, safeAmount, amountError, term, effectiveRate, processingFeeEnabled]);

  const schedule = useMemo(() => {
    if (!activePricing || !safeAmount || amountError) return [];
    return generateSchedule(
      safeAmount,
      effectiveRate,
      term,
      activePricing.rateType,
      quote.processingFee
    );
  }, [activePricing, safeAmount, amountError, effectiveRate, term, quote.processingFee]);

  const scenarioTerms = useMemo(() => {
    if (!activePricing) return [];
    const base = [...activePricing.allowedTerms].sort((a, b) => a - b);
    if (!base.includes(term)) base.push(term);
    return [...new Set(base)].slice(0, 3);
  }, [activePricing, term]);

  const scenarios = useMemo(() => {
    if (!activePricing || !safeAmount || amountError) return [];
    return scenarioTerms.map((t) => {
      const s = calculateQuote({
        principal: safeAmount,
        months: t,
        rateType: activePricing.rateType,
        monthlyRate: effectiveRate,
        processingFeeEnabled,
        processingFeeRate: activePricing.processingFeeRate,
      });
      return { term: t, emi: s.emi };
    });
  }, [activePricing, safeAmount, amountError, scenarioTerms, effectiveRate, processingFeeEnabled]);

  const principalPct = quote.totalWithFees > 0 ? (safeAmount / quote.totalWithFees) * 100 : 0;
  const interestPct = quote.totalWithFees > 0 ? (quote.totalInterest / quote.totalWithFees) * 100 : 0;
  const feePct = quote.totalWithFees > 0 ? (quote.processingFee / quote.totalWithFees) * 100 : 0;

  const applyHref = useMemo(() => {
    if (!activeProduct || !activePricing || amountError) return "/apply";

    const params = new URLSearchParams({
      product: activeProduct.slug,
      productName: activeProduct.loanName,
      category: activeProduct.category,
      amount: String(Math.round(safeAmount)),
      amountRange: activeProduct.amountRange,
      repaymentPeriod: `${term} months`,
      term: String(term),
      rateType: activePricing.rateType,
      monthlyRate: effectiveRate.toFixed(4),
      processingFee: Math.round(quote.processingFee).toString(),
      monthlyEmi: Math.round(quote.emi).toString(),
      totalRepayment: Math.round(quote.totalWithFees).toString(),
      totalInterest: Math.round(quote.totalInterest).toString(),
      individualCategory,
      pricingAssumption: activePricing.assumptions,
    });

    return `/apply?${params.toString()}`;
  }, [
    activeProduct,
    activePricing,
    amountError,
    safeAmount,
    term,
    effectiveRate,
    quote.processingFee,
    quote.emi,
    quote.totalWithFees,
    quote.totalInterest,
    individualCategory,
  ]);

  const handleShare = async () => {
    if (!activeProduct || amountError) return;
    const shareUrl = `${window.location.origin}${applyHref}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareMessage("Quote link copied.");
      trackEvent("calculator_quote_shared", { method: "clipboard", product: activeProduct.slug });
    } catch {
      setShareMessage("Unable to copy link.");
    }
  };

  const handleExport = () => {
    if (!activeProduct || !activePricing || amountError) return;

    const payload = [
      "Alinafe Capital - Repayment Estimate",
      `Date: ${new Date().toLocaleString()}`,
      `Product: ${activeProduct.loanName}`,
      `Amount: ${formatMWK(safeAmount)}`,
      `Term: ${term} months`,
      `Employment Category: ${categorySettings.label}`,
      `Rate Type: ${activePricing.rateType}`,
      `Monthly Rate: ${(effectiveRate * 100).toFixed(2)}%`,
      `Monthly Installment: ${formatMWK(quote.emi)}`,
      `Total Interest: ${formatMWK(quote.totalInterest)}`,
      `Processing Fee: ${formatMWK(quote.processingFee)}`,
      `Total Repayment: ${formatMWK(quote.totalWithFees)}`,
      `Pricing Assumption: ${activePricing.assumptions}`,
      `Rates Updated On: ${LAST_UPDATED}`,
    ].join("\n");

    const blob = new Blob([payload], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "alinafe-repayment-estimate.txt";
    a.click();
    URL.revokeObjectURL(url);

    trackEvent("calculator_quote_exported", { product: activeProduct.slug });
  };

  const handleStartApplication = () => {
    if (!activeProduct || amountError) return;
    guardStartApplication({
      productId: activeProduct.slug,
      navigate,
      api,
    });
  };

  return (
    <section className="py-24 bg-gradient-to-br from-white to-gray-50">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold" style={{ color: BRAND_NAVY }}>
            Repayment Calculator
          </h2>
          <p className="mt-4 text-gray-600">See your monthly payment before you apply.</p>
          <p className="text-sm text-gray-500 mt-1">All amounts are shown in MWK.</p>
        </div>

        <div className="mt-16 grid lg:grid-cols-2 gap-12">
          <div className="bg-white p-8 rounded-2xl shadow">
            <label htmlFor="loan-product" className="block text-sm font-medium">
              Loan Product <span className="text-red-600">*</span>
            </label>
            <select
              id="loan-product"
              value={selectedProductSlug}
              onChange={(e) => {
                setSelectedProductSlug(e.target.value);
                trackEvent("calculator_product_changed", { product: e.target.value });
              }}
              className="mt-2 w-full border p-3 rounded-lg"
            >
              <option value="">Select loan product</option>
              {productOptions.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.loanName}
                </option>
              ))}
            </select>
            {!activeProduct && <p className="mt-1 text-xs text-red-600">Please choose a loan product first.</p>}

            <label htmlFor="loan-amount" className="block mt-6 text-sm font-medium">
              Loan Amount
            </label>
            <input
              id="loan-amount"
              type="number"
              min={activePricing?.minAmount || 0}
              max={activePricing?.maxAmount || 0}
              disabled={!activePricing}
              value={amountInput}
              onChange={(e) => {
                setAmountInput(e.target.value);
                setAmountError(validateAmount(e.target.value));
              }}
              onBlur={() => {
                const error = validateAmount(amountInput);
                setAmountError(error);
                if (!error && activePricing) {
                  setAmountInput(String(clamp(Number(amountInput), activePricing.minAmount, activePricing.maxAmount)));
                }
              }}
              className="mt-2 w-full border p-3 rounded-lg disabled:bg-slate-100"
              aria-invalid={!!amountError}
              aria-describedby="loan-amount-help"
            />
            <p id="loan-amount-help" className={`mt-1 text-xs ${amountError ? "text-red-600" : "text-gray-500"}`}>
              {amountError || (activePricing ? `You can choose from ${formatMWK(activePricing.minAmount)} to ${formatMWK(activePricing.maxAmount)}.` : "Choose product first.")}
            </p>

            <input
              type="range"
              min={activePricing?.minAmount || 0}
              max={activePricing?.maxAmount || 0}
              step={50000}
              disabled={!activePricing}
              value={safeAmount || 0}
              onChange={(e) => {
                setAmountInput(e.target.value);
                setAmountError("");
              }}
              className="w-full mt-4"
              aria-label="Loan amount slider"
            />

            <label htmlFor="loan-term" className="block mt-6 text-sm font-medium">
              Loan Term (Months)
            </label>
            <select
              id="loan-term"
              value={term}
              disabled={!activePricing}
              onChange={(e) => setTerm(Number(e.target.value))}
              className="mt-2 w-full border p-3 rounded-lg disabled:bg-slate-100"
            >
              {allowedTerms.map((m) => (
                <option key={m} value={m}>
                  {m} months
                </option>
              ))}
            </select>

            <fieldset className="mt-6">
              <legend className="block text-sm font-medium">Work Type</legend>
              <div className="mt-2 grid sm:grid-cols-2 gap-3" role="group" aria-label="Employment category selection">
                <button
                  type="button"
                  aria-pressed={individualCategory === "government"}
                  onClick={() => {
                    setIndividualCategory("government");
                    trackEvent("calculator_category_changed", { category: "government" });
                  }}
                  className={`border rounded-lg p-3 text-sm font-medium text-left transition ${
                    individualCategory === "government"
                      ? "border-[#002D5B] bg-blue-50 text-[#002D5B]"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  Govt Employee
                </button>

                <button
                  type="button"
                  aria-pressed={individualCategory === "private"}
                  onClick={() => {
                    setIndividualCategory("private");
                    trackEvent("calculator_category_changed", { category: "private" });
                  }}
                  className={`border rounded-lg p-3 text-sm font-medium text-left transition ${
                    individualCategory === "private"
                      ? "border-[#002D5B] bg-blue-50 text-[#002D5B]"
                      : "border-gray-300 hover:border-gray-400"
                  }`}
                >
                  Private Company Employee
                </button>
              </div>
            </fieldset>

            <div className="mt-6 flex items-center gap-3">
              <input
                id="include-processing"
                type="checkbox"
                disabled={!activePricing}
                checked={processingFeeEnabled}
                onChange={() => {
                  const next = !processingFeeEnabled;
                  setProcessingFeeEnabled(next);
                  trackEvent("calculator_processing_fee_toggled", { enabled: next });
                }}
              />
              <label htmlFor="include-processing" className="text-sm">
                Add Processing Fee
              </label>
            </div>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handleShare}
                disabled={!activeProduct || !!amountError}
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                <Share2 size={16} /> Share
              </button>
              <button
                type="button"
                onClick={handleExport}
                disabled={!activeProduct || !!amountError}
                className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold disabled:opacity-50"
              >
                <Download size={16} /> Export
              </button>
            </div>
            {shareMessage && <p className="mt-2 text-xs text-gray-500">{shareMessage}</p>}
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-lg">
            <h3 className="text-xl font-semibold mb-6">Your Estimate</h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-500">Monthly Installment</p>
                <p className="text-2xl font-bold" style={{ color: BRAND_NAVY }}>
                  {formatMWK(quote.emi)}
                </p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Selected Product</p>
                <p className="font-semibold">{activeProduct ? activeProduct.loanName : "-"}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Monthly Rate</p>
                <p className="font-semibold">{(effectiveRate * 100).toFixed(2)}%</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Total to Pay (with fees)</p>
                <p className="font-semibold">{formatMWK(quote.totalWithFees)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Total Interest</p>
                <p>{formatMWK(quote.totalInterest)}</p>
              </div>

              <div>
                <p className="text-sm text-gray-500">Processing Fee</p>
                <p>{formatMWK(quote.processingFee)}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border p-4" style={{ borderColor: "rgba(0,45,91,0.12)" }}>
              <p className="text-sm font-semibold" style={{ color: BRAND_NAVY }}>
                Pricing Basis
              </p>
              <ul className="mt-2 space-y-1 text-xs text-slate-700">
                <li>• Rate Type: {activePricing?.rateType || "-"}</li>
                <li>• Base Rate: {activePricing ? `${(activePricing.baseMonthlyRate * 100).toFixed(2)}%` : "-"}</li>
                <li>• Work Type Adjustment: {categorySettings.rateDelta >= 0 ? "+" : ""}{(categorySettings.rateDelta * 100).toFixed(2)}%</li>
                <li>• Processing Fee: {activePricing ? `${(activePricing.processingFeeRate * 100).toFixed(2)}%` : "-"}</li>
                <li>• Note: {activePricing?.assumptions || "-"}</li>
              </ul>
            </div>

            <div className="mt-4 rounded-xl border p-4" style={{ borderColor: "rgba(0,45,91,0.12)" }}>
              <p className="text-sm font-semibold" style={{ color: BRAND_NAVY }}>
                Cost Breakdown
              </p>
              <div className="mt-3 h-3 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full bg-slate-700" style={{ width: `${principalPct}%`, float: "left" }} />
                <div className="h-full bg-amber-500" style={{ width: `${interestPct}%`, float: "left" }} />
                <div className="h-full bg-indigo-400" style={{ width: `${feePct}%`, float: "left" }} />
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600">
                <p>Principal: {formatMWK(safeAmount)}</p>
                <p>Interest: {formatMWK(quote.totalInterest)}</p>
                <p>Fee: {formatMWK(quote.processingFee)}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border bg-slate-50 p-4 text-xs text-slate-700" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
              <p className="font-semibold inline-flex items-center gap-1" style={{ color: BRAND_NAVY }}>
                <ShieldCheck size={14} /> Compliance Note
              </p>
              <p className="mt-1">
                This is only an estimate. Final loan terms may change after checks.
              </p>
              <p className="mt-1 text-slate-500">Rates updated on: {LAST_UPDATED}</p>
            </div>

            <div className="mt-6 flex gap-4 flex-wrap">
              <button
                type="button"
                onClick={() => {
                  trackEvent("calculator_apply_clicked", {
                    product: activeProduct?.slug,
                    amount: safeAmount,
                    term,
                  });
                  handleStartApplication();
                }}
                disabled={!activeProduct || !!amountError}
                className="px-6 py-3 rounded-lg text-white font-semibold disabled:opacity-50"
                style={{ backgroundColor: BRAND_NAVY }}
              >
                Apply with this plan
              </button>

              <a href="tel:+265999000000" className="px-6 py-3 rounded-lg border font-semibold flex items-center gap-2">
                <Phone size={16} /> Talk to Loan Officer
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 lg:hidden sticky bottom-4 z-20">
          <div className="mx-auto max-w-xl rounded-xl border bg-white/95 backdrop-blur p-4 shadow-lg" style={{ borderColor: "rgba(0,45,91,0.15)" }}>
            <p className="text-xs text-gray-500">Quick Summary</p>
            <div className="mt-1 flex items-center justify-between">
              <p className="font-semibold">Monthly EMI</p>
              <p className="font-bold" style={{ color: BRAND_NAVY }}>{formatMWK(quote.emi)}</p>
            </div>
            <button
              type="button"
              onClick={handleStartApplication}
              disabled={!activeProduct || !!amountError}
              className="mt-3 inline-flex w-full justify-center rounded-lg px-4 py-2.5 text-white font-semibold disabled:opacity-50"
              style={{ backgroundColor: BRAND_NAVY }}
            >
              Continue to Apply
            </button>
          </div>
        </div>

        <div className="mt-20">
          <h3 className="text-xl font-bold mb-6">Compare Loan Months</h3>
          <div className="grid md:grid-cols-3 gap-6">
            {scenarios.map((s) => (
              <div key={s.term} className={`p-6 rounded-2xl shadow ${s.term === term ? "border-2" : ""}`} style={s.term === term ? { borderColor: BRAND_GOLD } : {}}>
                <p className="font-semibold">{s.term} Months</p>
                <p className="mt-2 text-lg font-bold">{formatMWK(s.emi)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-20 overflow-x-auto">
          <h3 className="text-xl font-bold mb-6">Repayment Breakdown</h3>
          <table className="w-full text-sm border">
            <caption className="sr-only">Repayment schedule for first six months</caption>
            <thead style={{ backgroundColor: BRAND_NAVY, color: "white" }}>
              <tr>
                <th scope="col" className="p-3">Month</th>
                <th scope="col">EMI</th>
                <th scope="col">Principal</th>
                <th scope="col">Interest</th>
                <th scope="col">Balance</th>
              </tr>
            </thead>
            <tbody>
              {schedule.slice(0, 6).map((row) => (
                <tr key={row.month} className="text-center border-t">
                  <td className="p-2">{row.month}</td>
                  <td>{formatMWK(row.emi)}</td>
                  <td>{formatMWK(row.principalPaid)}</td>
                  <td>{formatMWK(row.interest)}</td>
                  <td>{formatMWK(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-4">Showing first 6 months only.</p>
        </div>

        <div className="mt-14 rounded-2xl border bg-white p-6 md:p-8" style={{ borderColor: "rgba(0,45,91,0.12)" }}>
          <div className="flex items-start gap-3">
            <ShieldCheck size={20} style={{ color: BRAND_GOLD, marginTop: 2 }} />
            <div>
              <h4 className="text-lg font-semibold" style={{ color: BRAND_NAVY }}>Regulatory & Disclosure</h4>
              <p className="mt-2 text-sm text-gray-700">
                These numbers are for guidance only. Final rates may change after checks.
              </p>
              <p className="mt-2 text-xs text-gray-500">Rates updated on: {LAST_UPDATED}</p>
              <div className="mt-3 flex flex-wrap gap-4 text-sm">
                <a href="/interest-rates" className="underline">Interest Rates</a>
                <a href="/terms" className="underline">Terms</a>
                <a href="/privacy" className="underline">Privacy</a>
                <a href="/complaints" className="underline">Complaints</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RepaymentCalculator;
export { RepaymentCalculator };

