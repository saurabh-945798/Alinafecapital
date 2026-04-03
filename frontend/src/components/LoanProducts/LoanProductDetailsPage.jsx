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
  BriefcaseBusiness,
  Building2,
  Tractor,
  WalletCards,
  Sparkles,
} from "lucide-react";
import { api } from "../../services/api";
import { guardStartApplication } from "../../utils/applyGuard";
import { useLoanProducts } from "../../hooks/useLoanProducts";

const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";

const visualByCategory = {
  Agriculture: {
    icon: Tractor,
    eyebrow: "Seasonal support",
    headline: "Built for productive growth",
    summary:
      "Structured funding for agriculture cycles, equipment, and business expansion with clear repayment expectations.",
    chips: ["Clear pricing", "Fast review", "Flexible use"],
    shellClass:
      "border-emerald-200 bg-[radial-gradient(circle_at_top_right,_rgba(16,185,129,0.22),_transparent_42%),linear-gradient(135deg,_#062f2b,_#0f4c43_55%,_#11665a)]",
    cardClass: "border-emerald-100 bg-white/12 text-emerald-50",
    iconWrapClass: "bg-white/14 text-emerald-100 border-white/15",
  },
  Business: {
    icon: BriefcaseBusiness,
    eyebrow: "Business finance",
    headline: "Working capital with clean structure",
    summary:
      "Designed for business owners who need predictable repayment, transparent costs, and practical turnaround time.",
    chips: ["Business growth", "Transparent fees", "Simple review"],
    shellClass:
      "border-amber-200 bg-[radial-gradient(circle_at_top_right,_rgba(179,142,70,0.28),_transparent_45%),linear-gradient(135deg,_#1b2434,_#22375c_55%,_#34558c)]",
    cardClass: "border-amber-100/30 bg-white/12 text-amber-50",
    iconWrapClass: "bg-white/14 text-amber-100 border-white/15",
  },
  Personal: {
    icon: WalletCards,
    eyebrow: "Personal finance",
    headline: "Simple lending for real needs",
    summary:
      "A straightforward loan product built for salaried and individual customers who want clarity before they apply.",
    chips: ["Simple terms", "Fast checks", "Repayment clarity"],
    shellClass:
      "border-sky-200 bg-[radial-gradient(circle_at_top_right,_rgba(96,165,250,0.26),_transparent_45%),linear-gradient(135deg,_#11263d,_#173a68_55%,_#245a9b)]",
    cardClass: "border-sky-100/30 bg-white/12 text-sky-50",
    iconWrapClass: "bg-white/14 text-sky-100 border-white/15",
  },
  Group: {
    icon: Building2,
    eyebrow: "Community lending",
    headline: "Shared accountability, shared progress",
    summary:
      "Built for group borrowers who need a disciplined structure, simple documentation, and a predictable meeting cycle.",
    chips: ["Group support", "Shared discipline", "Structured payouts"],
    shellClass:
      "border-violet-200 bg-[radial-gradient(circle_at_top_right,_rgba(168,85,247,0.24),_transparent_45%),linear-gradient(135deg,_#241641,_#3c2674_55%,_#5c3aa5)]",
    cardClass: "border-violet-100/30 bg-white/12 text-violet-50",
    iconWrapClass: "bg-white/14 text-violet-100 border-white/15",
  },
};

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

const getProductVisual = (product) =>
  visualByCategory[product.category] || visualByCategory.Personal;

const ProductHeroVisual = ({ product }) => {
  const visual = getProductVisual(product);
  const Icon = visual.icon;

  return (
    <div
      className={`relative overflow-hidden rounded-[28px] border text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)] ${visual.shellClass}`}
    >
      <div className="absolute inset-0 opacity-70">
        <div className="absolute -left-10 top-8 h-28 w-28 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-36 w-36 rounded-full bg-black/10 blur-3xl" />
      </div>

      <div className="relative z-10 p-5 sm:p-6 lg:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/75">
              {visual.eyebrow}
            </p>
            <h3 className="mt-3 max-w-xl text-2xl font-semibold leading-tight sm:text-3xl">
              {visual.headline}
            </h3>
            <p className="mt-4 max-w-2xl text-sm leading-6 text-white/85 sm:text-[15px]">
              {visual.summary}
            </p>
          </div>
          <div
            className={`grid h-14 w-14 place-items-center rounded-2xl border backdrop-blur ${visual.iconWrapClass}`}
          >
            <Icon size={28} />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          {visual.chips.map((chip) => (
            <span
              key={chip}
              className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/90"
            >
              {chip}
            </span>
          ))}
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className={`rounded-2xl border p-4 backdrop-blur ${visual.cardClass}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
              Product Type
            </p>
            <p className="mt-2 text-sm font-semibold">{product.category}</p>
          </div>
          <div className={`rounded-2xl border p-4 backdrop-blur ${visual.cardClass}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
              Pricing View
            </p>
            <p className="mt-2 text-sm font-semibold">{product.interestRate}</p>
          </div>
          <div className={`rounded-2xl border p-4 backdrop-blur ${visual.cardClass}`}>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
              Repayment
            </p>
            <p className="mt-2 text-sm font-semibold">{product.repaymentPeriod}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
const OverviewCard = ({ label, value }) => (
  <div
    className="rounded-2xl border bg-white p-4 shadow-sm sm:p-5"
    style={{ borderColor: "rgba(0,45,91,0.10)" }}
  >
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
    <p className="mt-2 text-sm font-semibold text-slate-900 sm:text-base">{value}</p>
  </div>
);

const SectionCard = ({ icon: Icon, title, children, className = "" }) => (
  <div
    className={`rounded-[24px] border bg-white p-5 shadow-sm sm:p-6 ${className}`}
    style={{ borderColor: "rgba(0,45,91,0.10)" }}
  >
    <h2 className="inline-flex items-center gap-2 text-lg font-semibold" style={{ color: BRAND_NAVY }}>
      <Icon size={18} /> {title}
    </h2>
    <div className="mt-4 text-sm text-slate-700">{children}</div>
  </div>
);

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
    <section className="min-h-[70vh] bg-[linear-gradient(180deg,_#f8fafc_0%,_#ffffff_32%,_#f8fafc_100%)] py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <a href="/home" className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: BRAND_NAVY }}>
          <ArrowLeft size={16} /> Back to Home
        </a>

        <article
          className="mt-5 rounded-[32px] border bg-white/88 p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur sm:p-8 lg:p-10"
          style={{ borderColor: "rgba(0,45,91,0.12)" }}
        >
          <div>
            <div>
              <span
                className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold"
                style={{
                  borderColor: "rgba(179,142,70,0.35)",
                  color: BRAND_GOLD,
                  backgroundColor: "rgba(179,142,70,0.08)",
                }}
              >
                <Sparkles size={14} className="mr-1.5" /> {product.badge}
              </span>

              <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl" style={{ color: BRAND_NAVY }}>
                {product.loanName}
              </h1>

              <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                {product.description}
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <OverviewCard label="Amount Range" value={product.amountRange} />
                <OverviewCard label="Repayment Period" value={product.repaymentPeriod} />
                <OverviewCard label="Interest Rate" value={product.interestRate} />
              </div>
            </div>
            <div className="mt-6">
              <ProductHeroVisual product={product} />
            </div>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-2">
            <div className="space-y-5">
              <SectionCard icon={ShieldCheck} title="Purpose">
                <p className="leading-7">{details.purpose}</p>
              </SectionCard>

              <SectionCard icon={Users} title="Target Users">
                <ul className="space-y-3">
                  {details.targetUsers.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 size={16} style={{ color: BRAND_GOLD, marginTop: 3, flexShrink: 0 }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>

              <SectionCard icon={CircleDollarSign} title="Fees & Disclosures">
                <ul className="space-y-3">
                  {details.feesAndDisclosures.map((item) => (
                    <li key={item} className="flex items-start gap-3">
                      <CheckCircle2 size={16} style={{ color: BRAND_GOLD, marginTop: 3, flexShrink: 0 }} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            </div>

            <div className="space-y-5">
              <SectionCard icon={FileText} title="Eligibility & Documents">
                <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-1">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Eligibility
                    </p>
                    <ul className="mt-3 space-y-2">
                      {details.eligibility.map((item) => (
                        <li key={item} className="flex items-start gap-3">
                          <CheckCircle2 size={16} style={{ color: BRAND_GOLD, marginTop: 3, flexShrink: 0 }} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Required Documents
                    </p>
                    <ul className="mt-3 space-y-2">
                      {details.documents.map((item) => (
                        <li key={item} className="flex items-start gap-3">
                          <CheckCircle2 size={16} style={{ color: BRAND_GOLD, marginTop: 3, flexShrink: 0 }} />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </SectionCard>

              <SectionCard icon={Clock3} title="Repayment Style">
                <p className="leading-7">{details.repaymentStyle}</p>
              </SectionCard>
            </div>
          </div>

          <div className="mt-8 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <SectionCard icon={ArrowRight} title="Application Process">
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {details.processTimeline.map((step, idx) => (
                  <div
                    key={step}
                    className="rounded-2xl border bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-4"
                    style={{ borderColor: "rgba(0,45,91,0.08)" }}
                  >
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      Step {idx + 1}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-slate-900">{step}</p>
                  </div>
                ))}
              </div>
            </SectionCard>

            <SectionCard icon={HelpCircle} title="FAQs">
              <div className="space-y-3">
                {details.faqs.map((faq) => (
                  <div
                    key={faq.q}
                    className="rounded-2xl border bg-[linear-gradient(180deg,_#ffffff_0%,_#f8fafc_100%)] p-4"
                    style={{ borderColor: "rgba(0,45,91,0.08)" }}
                  >
                    <p className="text-sm font-semibold" style={{ color: BRAND_NAVY }}>
                      {faq.q}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{faq.a}</p>
                  </div>
                ))}
              </div>
            </SectionCard>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
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

