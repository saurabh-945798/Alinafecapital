import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Phone,
  FileText,
  ShieldCheck,
  CircleDollarSign,
  Clock3,
  Users,
  HelpCircle,
} from "lucide-react";
import { api } from "../../services/api";
import { guardStartApplication } from "../../utils/applyGuard";
import { useLoanProducts } from "../../hooks/useLoanProducts";

const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";

const detailsBySlug = {
  "payday-emergency-loan": {
    purpose:
      "Immediate support for urgent personal expenses like medical treatment, school fees, rent top-ups, and household emergencies.",
    targetUsers: [
      "Salaried individuals",
      "Small traders with short cash gaps",
      "Existing clients with active repayment history",
    ],
    eligibility: [
      "Minimum age 18+",
      "Valid national ID",
      "Active mobile number",
      "Recent proof of income or cashflow",
    ],
    documents: ["National ID", "Proof of income or business cashflow", "Phone contact details"],
    repaymentStyle:
      "Single-cycle short repayment. Payment is expected on or before agreed due date.",
    feesAndDisclosures: [
      "Flat processing/servicing fee may apply",
      "Late payments may attract penalties",
      "Final offer is subject to affordability checks",
    ],
    processTimeline: ["Apply in 5 minutes", "Review within 24 hours", "Disbursement after approval"],
    faqs: [
      {
        q: "How fast can funds be disbursed?",
        a: "Most approved cases are processed within 24 hours, depending on verification completion.",
      },
      {
        q: "Can I reapply after repayment?",
        a: "Yes. Returning clients can reapply, subject to updated affordability checks.",
      },
    ],
  },
  "solidarity-group-loan": {
    purpose:
      "Working-capital support for group members operating small businesses through a shared accountability model.",
    targetUsers: [
      "Women savings groups",
      "Market traders",
      "Community lending circles (5 to 20 members)",
    ],
    eligibility: [
      "Registered/verified group membership",
      "Group meeting structure and repayment commitment",
      "Each member must provide basic KYC documents",
    ],
    documents: ["National ID per member", "Group member list", "Basic business activity proof"],
    repaymentStyle:
      "Weekly or bi-weekly installment meetings (or digital check-ins). Group guarantees member performance.",
    feesAndDisclosures: [
      "Flat monthly group lending rate",
      "Group members share repayment accountability",
      "Late repayment in one account can affect the whole group",
    ],
    processTimeline: ["Group onboarding", "Eligibility review", "Disbursement to approved members"],
    faqs: [
      {
        q: "What happens if one member misses payment?",
        a: "Under solidarity rules, the group supports the shortfall and resolves repayment collectively.",
      },
      {
        q: "Can a group re-borrow?",
        a: "Yes, after demonstrating strong repayment performance and passing new review checks.",
      },
    ],
  },
  "rain-fed-dzinja-seasonal-loan": {
    purpose:
      "Seasonal crop finance for rain-fed production cycles, including seeds, fertilizer, and labor costs.",
    targetUsers: ["Smallholder farmers", "Commercial small-scale farmers", "Crop-cycle borrowers"],
    eligibility: [
      "Active farming activity",
      "Land use/access confirmation",
      "Repayment plan aligned to harvest sales",
    ],
    documents: ["National ID", "Basic farm profile", "Seasonal production plan"],
    repaymentStyle:
      "Bullet repayment model: limited or no early monthly burden, final repayment aligned with harvest proceeds.",
    feesAndDisclosures: [
      "Seasonal lending rates apply",
      "Disbursement and terms are tied to crop cycle risk",
      "Final terms depend on underwriting and portfolio policy",
    ],
    processTimeline: ["Farm profile review", "Seasonal risk assessment", "Disbursement before planting"],
    faqs: [
      {
        q: "When do I start repaying?",
        a: "Repayment is structured around harvest timing and agreed sales cycle.",
      },
      {
        q: "Can terms be adjusted for delayed harvest?",
        a: "Case-by-case adjustments may be considered under approved credit policy.",
      },
    ],
  },
};

const getProductDetails = (product) => {
  const defaults = {
    purpose:
      "Structured credit product tailored to customer needs with clear pricing and repayment terms.",
    targetUsers: ["Individuals", "Micro and small businesses", "Returning clients"],
    eligibility: [
      "Valid national ID",
      "Demonstrable repayment capacity",
      "Active mobile number",
      "Successful affordability and KYC checks",
    ],
    documents: ["National ID", "Proof of income or business cashflow", "Contact details"],
    repaymentStyle: `Repayment follows agreed schedule over ${product.repaymentPeriod}.`,
    feesAndDisclosures: [
      `Indicative pricing: ${product.interestRate}`,
      "Processing and admin charges may apply",
      "Final offer depends on profile, affordability, and compliance checks",
    ],
    processTimeline: ["Select product", "Submit application", "Verification", "Approval and disbursement"],
    faqs: [
      {
        q: "How is eligibility decided?",
        a: "Eligibility is based on KYC, affordability, and product-specific risk assessment.",
      },
      {
        q: "Can I settle early?",
        a: "Early settlement options may be available according to your signed loan terms.",
      },
    ],
  };

  return { ...defaults, ...(detailsBySlug[product.slug] || {}) };
};

const LoanProductDetailsPage = () => {
  const navigate = useNavigate();
  const { loanProducts: dynamicLoanProducts, loading } = useLoanProducts();
  const pathname = typeof window !== "undefined" ? window.location.pathname : "";

  const product = useMemo(() => {
    const slug = pathname.split("/").filter(Boolean).pop();
    return dynamicLoanProducts.find((p) => p.slug === slug);
  }, [pathname, dynamicLoanProducts]);

  if (loading) {
    return (
      <section className="py-24 min-h-[60vh]">
        <div className="max-w-4xl mx-auto px-6">
          <p className="text-sm text-gray-600">Loading product details...</p>
        </div>
      </section>
    );
  }

  if (!product) {
    return (
      <section className="py-24 min-h-[60vh]">
        <div className="max-w-4xl mx-auto px-6">
          <h1 className="text-3xl font-bold" style={{ color: BRAND_NAVY }}>
            Product not found
          </h1>
          <p className="mt-3 text-gray-600">The loan product link is invalid or no longer available.</p>
          <a href="/home" className="mt-6 inline-flex items-center gap-2 font-semibold" style={{ color: BRAND_NAVY }}>
            <ArrowLeft size={16} /> Back to Home
          </a>
        </div>
      </section>
    );
  }

  const details = getProductDetails(product);
  return (
    <section className="py-24 bg-gradient-to-br from-white to-gray-50 min-h-[70vh]">
      <div className="max-w-6xl mx-auto px-6">
        <a href="/home" className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: BRAND_NAVY }}>
          <ArrowLeft size={16} /> Back to Home
        </a>

        <article className="mt-6 rounded-3xl border bg-white p-8 md:p-10 shadow-sm" style={{ borderColor: "rgba(0,45,91,0.12)" }}>
          <span
            className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold"
            style={{ borderColor: "rgba(179,142,70,0.35)", color: BRAND_GOLD, backgroundColor: "rgba(179,142,70,0.08)" }}
          >
            {product.badge}
          </span>

          <h1 className="mt-4 text-3xl md:text-4xl font-bold" style={{ color: BRAND_NAVY }}>
            {product.loanName}
          </h1>

          <p className="mt-3 text-gray-600">{product.description}</p>

          <div className="mt-7 grid sm:grid-cols-3 gap-4 text-sm">
            <div className="rounded-xl border bg-gray-50 p-4" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
              <p className="text-gray-500">Amount Range</p>
              <p className="mt-1 font-semibold">{product.amountRange}</p>
            </div>
            <div className="rounded-xl border bg-gray-50 p-4" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
              <p className="text-gray-500">Repayment Period</p>
              <p className="mt-1 font-semibold">{product.repaymentPeriod}</p>
            </div>
            <div className="rounded-xl border bg-gray-50 p-4" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
              <p className="text-gray-500">Interest</p>
              <p className="mt-1 font-semibold">{product.interestRate}</p>
            </div>
          </div>

          <div className="mt-8 grid gap-6 lg:grid-cols-2">
            <div className="rounded-2xl border p-5" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
              <h2 className="text-lg font-semibold inline-flex items-center gap-2" style={{ color: BRAND_NAVY }}>
                <ShieldCheck size={18} /> Purpose
              </h2>
              <p className="mt-2 text-sm text-gray-700">{details.purpose}</p>
            </div>

            <div className="rounded-2xl border p-5" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
              <h2 className="text-lg font-semibold inline-flex items-center gap-2" style={{ color: BRAND_NAVY }}>
                <Users size={18} /> Target Users
              </h2>
              <ul className="mt-2 space-y-2 text-sm text-gray-700">
                {details.targetUsers.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 size={16} style={{ color: BRAND_GOLD, marginTop: 2 }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border p-5" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
              <h2 className="text-lg font-semibold inline-flex items-center gap-2" style={{ color: BRAND_NAVY }}>
                <FileText size={18} /> Eligibility & Documents
              </h2>
              <p className="mt-2 text-xs font-semibold text-gray-500">Eligibility</p>
              <ul className="mt-1 space-y-1.5 text-sm text-gray-700">
                {details.eligibility.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
              <p className="mt-3 text-xs font-semibold text-gray-500">Documents</p>
              <ul className="mt-1 space-y-1.5 text-sm text-gray-700">
                {details.documents.map((item) => (
                  <li key={item}>• {item}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border p-5" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
              <h2 className="text-lg font-semibold inline-flex items-center gap-2" style={{ color: BRAND_NAVY }}>
                <Clock3 size={18} /> Repayment Style
              </h2>
              <p className="mt-2 text-sm text-gray-700">{details.repaymentStyle}</p>
            </div>

            <div className="rounded-2xl border p-5 lg:col-span-2" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
              <h2 className="text-lg font-semibold inline-flex items-center gap-2" style={{ color: BRAND_NAVY }}>
                <CircleDollarSign size={18} /> Fees & Disclosures
              </h2>
              <ul className="mt-2 space-y-2 text-sm text-gray-700">
                {details.feesAndDisclosures.map((item) => (
                  <li key={item} className="flex items-start gap-2">
                    <CheckCircle2 size={16} style={{ color: BRAND_GOLD, marginTop: 2 }} />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border p-5" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
            <h2 className="text-lg font-semibold" style={{ color: BRAND_NAVY }}>Application Process</h2>
            <div className="mt-3 grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {details.processTimeline.map((step, idx) => (
                <div key={step} className="rounded-xl bg-gray-50 border p-3 text-sm" style={{ borderColor: "rgba(0,45,91,0.08)" }}>
                  <p className="text-xs text-gray-500">Step {idx + 1}</p>
                  <p className="mt-1 font-semibold">{step}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 rounded-2xl border p-5" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
            <h2 className="text-lg font-semibold inline-flex items-center gap-2" style={{ color: BRAND_NAVY }}>
              <HelpCircle size={18} /> FAQs
            </h2>
            <div className="mt-3 space-y-3">
              {details.faqs.map((faq) => (
                <div key={faq.q} className="rounded-xl bg-gray-50 border p-4" style={{ borderColor: "rgba(0,45,91,0.08)" }}>
                  <p className="font-semibold text-sm" style={{ color: BRAND_NAVY }}>{faq.q}</p>
                  <p className="mt-1 text-sm text-gray-700">{faq.a}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <button
              type="button"
              onClick={() =>
                guardStartApplication({
                  productId: product.slug,
                  navigate,
                  api,
                })
              }
              className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white"
              style={{ backgroundColor: BRAND_NAVY }}
            >
              Apply Now <ArrowRight size={16} />
            </button>
            <a
              href="tel:+265999000000"
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3 font-semibold"
              style={{ borderColor: BRAND_GOLD, color: BRAND_GOLD }}
            >
              <Phone size={16} /> Talk to Loan Officer
            </a>
          </div>
        </article>
      </div>
    </section>
  );
};

export default LoanProductDetailsPage;




