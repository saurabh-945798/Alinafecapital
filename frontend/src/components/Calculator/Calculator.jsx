import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Phone,
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
  Number(num || 0).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });

const formatDate = (value) =>
  new Intl.DateTimeFormat("en-MW", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(value);

const addMonths = (dateValue, monthsToAdd) => {
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return null;
  date.setMonth(date.getMonth() + monthsToAdd);
  return date;
};

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

const normalizeLoanKey = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const FIXED_PRICING_BY_LOAN = {
  [normalizeLoanKey("Civil Servant loans")]: {
    baseMonthlyRate: 0.05,
    processingFeeType: "percent",
    processingFeeRate: 0.025,
    processingFeeFlat: 0,
    adminFeeType: "percent",
    adminFeeRate: 0.025,
    adminFeeFlat: 0,
    monthlyAdminFee: 0,
    allowedTerms: Array.from({ length: 12 }, (_, index) => index + 1),
  },
  [normalizeLoanKey("Private company loans")]: {
    baseMonthlyRate: 0.05,
    processingFeeType: "percent",
    processingFeeRate: 0.025,
    processingFeeFlat: 0,
    adminFeeType: "percent",
    adminFeeRate: 0.025,
    adminFeeFlat: 0,
    monthlyAdminFee: 0,
    allowedTerms: Array.from({ length: 12 }, (_, index) => index + 1),
  },
  [normalizeLoanKey("Statutory company loans")]: {
    baseMonthlyRate: 0.05,
    processingFeeType: "percent",
    processingFeeRate: 0.025,
    processingFeeFlat: 0,
    adminFeeType: "percent",
    adminFeeRate: 0.025,
    adminFeeFlat: 0,
    monthlyAdminFee: 0,
    allowedTerms: Array.from({ length: 12 }, (_, index) => index + 1),
  },
  [normalizeLoanKey("Business loans")]: {
    baseMonthlyRate: 0.075,
    processingFeeType: "percent",
    processingFeeRate: 0.025,
    processingFeeFlat: 0,
    adminFeeType: "percent",
    adminFeeRate: 0.025,
    adminFeeFlat: 0,
    monthlyAdminFee: 0,
    allowedTerms: Array.from({ length: 12 }, (_, index) => index + 1),
  },
};

const FIXED_PRICING_MATCHERS = [
  {
    match: (text) => text.includes("civil servant"),
    pricing: FIXED_PRICING_BY_LOAN[normalizeLoanKey("Civil Servant loans")],
  },
  {
    match: (text) => text.includes("private company"),
    pricing: FIXED_PRICING_BY_LOAN[normalizeLoanKey("Private company loans")],
  },
  {
    match: (text) => text.includes("statutory company") || text.includes("statutory"),
    pricing: FIXED_PRICING_BY_LOAN[normalizeLoanKey("Statutory company loans")],
  },
  {
    match: (text) => text.includes("business"),
    pricing: FIXED_PRICING_BY_LOAN[normalizeLoanKey("Business loans")],
  },
];

const resolveFixedPricing = (product) => {
  const raw = product?.raw || {};
  const exact =
    FIXED_PRICING_BY_LOAN[
      normalizeLoanKey(raw.name || product?.loanName || raw.slug || product?.slug)
    ];
  if (exact) return exact;

  const searchable = normalizeLoanKey(
    [raw.name, product?.loanName, raw.slug, product?.slug, raw.category, product?.category]
      .filter(Boolean)
      .join(" ")
  );

  return FIXED_PRICING_MATCHERS.find((entry) => entry.match(searchable))?.pricing || null;
};

const buildDynamicPricingConfig = (product) => {
  const raw = product?.raw || {};
  const fixedPricing = resolveFixedPricing(product);
  const baseMonthlyRate = fixedPricing?.baseMonthlyRate ?? toMonthlyDecimalRate(raw.interestRateMonthly);
  const processingFeeType =
    fixedPricing?.processingFeeType ?? (raw.processingFeeType === "flat" ? "flat" : "percent");
  const processingFeeRate =
    fixedPricing?.processingFeeRate ??
    (processingFeeType === "percent" ? toMonthlyDecimalRate(raw.processingFeeValue) : 0);
  const processingFeeFlat =
    fixedPricing?.processingFeeFlat ??
    (processingFeeType === "flat" ? Number(raw.processingFeeValue || 0) : 0);
  const interestType = raw.interestType === "flat" ? "flat" : "reducing";
  const rateType = baseMonthlyRate <= 0 && processingFeeRate > 0 ? "fee_only" : interestType;

  return {
    minAmount: Number(raw.minAmount || 0),
    maxAmount: Number(raw.maxAmount || 0),
    usesFixedProductPricing: Boolean(fixedPricing),
    allowedTerms:
      fixedPricing?.allowedTerms || buildAllowedTerms(raw.minTenureMonths, raw.maxTenureMonths),
    rateType,
    baseMonthlyRate,
    processingFeeType,
    processingFeeRate,
    processingFeeFlat,
    adminFeeType: fixedPricing?.adminFeeType || "flat",
    adminFeeRate: fixedPricing?.adminFeeRate || 0,
    adminFeeFlat: fixedPricing?.adminFeeFlat || 0,
    monthlyAdminFee: fixedPricing?.monthlyAdminFee ?? Number(raw.loanAdministrationFeeMonthly || 0),
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
    if (activePricing.usesFixedProductPricing) {
      return Math.max(0, activePricing.baseMonthlyRate);
    }
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
        monthlyAdminFee: 0,
        totalAdminFees: 0,
        monthlyDue: 0,
        firstMonthDue: 0,
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
      processingFeeType: activePricing.processingFeeType,
      processingFeeFlat: activePricing.processingFeeFlat,
      adminFeeType: activePricing.adminFeeType,
      adminFeeRate: activePricing.adminFeeRate,
      adminFeeFlat: activePricing.adminFeeFlat,
      monthlyAdminFee: activePricing.monthlyAdminFee,
    });
  }, [activePricing, safeAmount, amountError, term, effectiveRate, processingFeeEnabled]);

  const schedule = useMemo(() => {
    if (!activePricing || !safeAmount || amountError) return [];
    return generateSchedule(
      safeAmount,
      effectiveRate,
      term,
      activePricing.rateType,
      quote.processingFee,
      activePricing.monthlyAdminFee,
      quote.oneTimeAdminFee
    );
  }, [activePricing, safeAmount, amountError, effectiveRate, term, quote.processingFee, quote.oneTimeAdminFee]);

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
        processingFeeType: activePricing.processingFeeType,
        processingFeeFlat: activePricing.processingFeeFlat,
        adminFeeType: activePricing.adminFeeType,
        adminFeeRate: activePricing.adminFeeRate,
        adminFeeFlat: activePricing.adminFeeFlat,
        monthlyAdminFee: activePricing.monthlyAdminFee,
      });
      return { term: t, emi: s.monthlyDue };
    });
  }, [activePricing, safeAmount, amountError, scenarioTerms, effectiveRate, processingFeeEnabled]);

  const principalPct = quote.totalWithFees > 0 ? (safeAmount / quote.totalWithFees) * 100 : 0;
  const interestPct = quote.totalWithFees > 0 ? (quote.totalInterest / quote.totalWithFees) * 100 : 0;
  const feePct = quote.totalWithFees > 0 ? (quote.processingFee / quote.totalWithFees) * 100 : 0;
  const adminPct = quote.totalWithFees > 0 ? (quote.totalAdminFees / quote.totalWithFees) * 100 : 0;
  const firstMonthDue = schedule[0]?.monthlyDue || 0;
  const displayedFirstMonthDue = quote.firstMonthDue || firstMonthDue;
  const firstMonthFees = (schedule[0]?.processingFee || 0) + (schedule[0]?.adminFee || 0);
  const scheduleStartDate = useMemo(() => new Date(), []);
  const totalPrincipalPaid = schedule.reduce((sum, row) => sum + row.principalPaid, 0);

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
    const message = [
      "Alinafe Capital repayment estimate",
      `Product: ${activeProduct.loanName}`,
      `Amount: ${formatMWK(safeAmount)}`,
      `Term: ${term} months`,
      `Monthly due: ${formatMWK(quote.monthlyDue)}`,
      `First payment: ${formatMWK(quote.firstMonthDue)}`,
      `Processing fee: ${formatMWK(quote.processingFee)}`,
      `Admin fee: ${formatMWK(quote.totalAdminFees)}`,
      `Total repayment: ${formatMWK(quote.totalWithFees)}`,
      shareUrl,
    ].join("\n");

    try {
      if (navigator.share) {
        await navigator.share({
          title: "Alinafe Capital repayment estimate",
          text: message,
          url: shareUrl,
        });
        setShareMessage("Estimate shared.");
        trackEvent("calculator_quote_shared", { method: "native", product: activeProduct.slug });
        return;
      }

      await navigator.clipboard.writeText(message);
      setShareMessage("Estimate copied for sharing.");
      trackEvent("calculator_quote_shared", { method: "clipboard", product: activeProduct.slug });
    } catch {
      setShareMessage("Unable to share estimate.");
    }
  };

  const handleExport = () => {
    if (!activeProduct || !activePricing || amountError) return;
    const rows = [
      [
        "Month",
        "Due Date",
        "Monthly Due",
        "Principal",
        "Interest",
        "Admin Fee",
        "Processing Fee",
        "Remaining Balance",
      ],
      ...schedule.map((row) => [
        row.month,
        formatDate(addMonths(scheduleStartDate, row.month) || scheduleStartDate),
        Math.round(row.monthlyDue),
        Math.round(row.principalPaid),
        Math.round(row.interest),
        Math.round(row.adminFee),
        Math.round(row.processingFee),
        Math.round(row.balance),
      ]),
      [],
      ["Product", activeProduct.loanName],
      ["Loan Amount", Math.round(safeAmount)],
      ["Term (months)", term],
      ["Monthly Base Installment", Math.round(quote.emi)],
      ["Recurring Monthly Due", Math.round(quote.monthlyDue)],
      ["First Payment Due", Math.round(quote.firstMonthDue)],
      ["Processing Fee", Math.round(quote.processingFee)],
      ["Admin Fee", Math.round(quote.totalAdminFees)],
      ["Total Admin Fees", Math.round(quote.totalAdminFees)],
      ["Total Interest", Math.round(quote.totalInterest)],
      ["Total Repayment", Math.round(quote.totalWithFees)],
      ["Rates Updated On", LAST_UPDATED],
    ];
    const payload = rows.map((row) => row.join(",")).join("\n");

    const blob = new Blob([payload], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "alinafe-repayment-schedule.csv";
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
                Add Processing and Admin Fees
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
                  {formatMWK(quote.monthlyDue)}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  Base installment {formatMWK(quote.emi)}. First payment is {formatMWK(quote.firstMonthDue)} including one-time fees.
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

              <div>
                <p className="text-sm text-gray-500">Admin Fee</p>
                <p>{formatMWK(quote.totalAdminFees)}</p>
              </div>
            </div>

            <div className="mt-6 rounded-xl border p-4" style={{ borderColor: "rgba(0,45,91,0.12)" }}>
              <p className="text-sm font-semibold" style={{ color: BRAND_NAVY }}>
                Pricing Basis
              </p>
              <ul className="mt-2 space-y-1 text-xs text-slate-700">
                <li>• Rate Type: {activePricing?.rateType || "-"}</li>
                <li>• Base Rate: {activePricing ? `${(activePricing.baseMonthlyRate * 100).toFixed(2)}%` : "-"}</li>
                <li>• Work Type Adjustment: {activePricing?.usesFixedProductPricing ? "Fixed by product table" : `${categorySettings.rateDelta >= 0 ? "+" : ""}${(categorySettings.rateDelta * 100).toFixed(2)}%`}</li>
                <li>• Processing Fee: {activePricing ? activePricing.processingFeeType === "flat" ? formatMWK(activePricing.processingFeeFlat) : `${(activePricing.processingFeeRate * 100).toFixed(2)}%` : "-"}</li>
                <li>• Admin Fee: {activePricing ? activePricing.adminFeeType === "percent" ? `${(activePricing.adminFeeRate * 100).toFixed(2)}%` : formatMWK(activePricing.adminFeeFlat) : "-"}</li>
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
                <div className="h-full bg-emerald-500" style={{ width: `${adminPct}%`, float: "left" }} />
              </div>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs text-gray-600">
                <p>Principal: {formatMWK(safeAmount)}</p>
                <p>Interest: {formatMWK(quote.totalInterest)}</p>
                <p>Processing: {formatMWK(quote.processingFee)}</p>
                <p>Admin: {formatMWK(quote.totalAdminFees)}</p>
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

              <a href="tel:+265997031941" className="px-6 py-3 rounded-lg border font-semibold flex items-center gap-2">
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
              <p className="font-bold" style={{ color: BRAND_NAVY }}>{formatMWK(quote.monthlyDue)}</p>
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
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-xl font-bold">Monthly Repayment Schedule</h3>
              <p className="mt-1 text-sm text-slate-600">
                Full month-by-month view of principal, interest, processing fee, admin fee, and remaining balance.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Principal</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{formatMWK(totalPrincipalPaid)}</p>
              </div>
              <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">First Month Fees</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{formatMWK(firstMonthFees)}</p>
              </div>
              <div className="rounded-2xl border bg-white px-4 py-3 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Monthly Due</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{formatMWK(displayedFirstMonthDue)}</p>
              </div>
            </div>
          </div>

          <table className="mt-6 min-w-[980px] w-full text-sm border">
            <caption className="sr-only">Full repayment schedule</caption>
            <thead style={{ backgroundColor: BRAND_NAVY, color: "white" }}>
              <tr>
                <th scope="col" className="p-3">Month</th>
                <th scope="col">Due Date</th>
                <th scope="col">Monthly Due</th>
                <th scope="col">Principal</th>
                <th scope="col">Interest</th>
                <th scope="col">Admin Fee</th>
                <th scope="col">Processing Fee</th>
                <th scope="col">Balance</th>
              </tr>
            </thead>
            <tbody>
              {schedule.map((row) => (
                <tr key={row.month} className="text-center border-t">
                  <td className="p-2">{row.month}</td>
                  <td>{formatDate(addMonths(scheduleStartDate, row.month) || scheduleStartDate)}</td>
                  <td>{formatMWK(row.monthlyDue)}</td>
                  <td>{formatMWK(row.principalPaid)}</td>
                  <td>{formatMWK(row.interest)}</td>
                  <td>{formatMWK(row.adminFee)}</td>
                  <td>{formatMWK(row.processingFee)}</td>
                  <td>{formatMWK(row.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-xs text-gray-500 mt-4">
            The first month includes the one-time processing fee where applicable. Download the full schedule for customer sharing or branch records.
          </p>
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
                <a href="/complaints" className="underline">Complaints & Support</a>
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
