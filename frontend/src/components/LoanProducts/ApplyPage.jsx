import { useMemo } from "react";
import { ArrowLeft, CheckCircle2, FileText, Phone } from "lucide-react";
import { loanProducts } from "./loanProductsData";

const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";

const ApplyPage = () => {
  const search = typeof window !== "undefined" ? window.location.search : "";

  const selected = useMemo(() => {
    const params = new URLSearchParams(search);
    const slug = params.get("product") || "";
    const fromData = loanProducts.find((p) => p.slug === slug);

    return {
      product: fromData?.loanName || "Loan Application",
      category: fromData?.category || params.get("category") || "General",
      amountRange: fromData?.amountRange || params.get("amountRange") || "Subject to eligibility",
      repaymentPeriod:
        fromData?.repaymentPeriod || params.get("repaymentPeriod") || "Based on product terms",
      slug: fromData?.slug || slug,
    };
  }, [search]);

  return (
    <section className="py-24 bg-gradient-to-br from-white to-gray-50 min-h-[70vh]">
      <div className="max-w-5xl mx-auto px-6">
        <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: BRAND_NAVY }}>
          <ArrowLeft size={16} /> Back to Home
        </a>

        <div className="mt-6 rounded-3xl border bg-white p-8 md:p-10 shadow-sm" style={{ borderColor: "rgba(0,45,91,0.12)" }}>
          <span
            className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold"
            style={{ borderColor: "rgba(179,142,70,0.35)", color: BRAND_GOLD, backgroundColor: "rgba(179,142,70,0.08)" }}
          >
            Application Flow
          </span>

          <h1 className="mt-4 text-3xl md:text-4xl font-bold" style={{ color: BRAND_NAVY }}>
            Apply for {selected.product}
          </h1>

          <p className="mt-3 text-gray-600">
            Product pre-selected from Loan Products. Next step is to complete eligibility and applicant details.
          </p>

          <div className="mt-8 grid sm:grid-cols-2 gap-4 text-sm">
            <div className="rounded-xl border bg-gray-50 p-4" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
              <p className="text-gray-500">Category</p>
              <p className="mt-1 font-semibold">{selected.category}</p>
            </div>
            <div className="rounded-xl border bg-gray-50 p-4" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
              <p className="text-gray-500">Amount Range</p>
              <p className="mt-1 font-semibold">{selected.amountRange}</p>
            </div>
            <div className="rounded-xl border bg-gray-50 p-4" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
              <p className="text-gray-500">Repayment Period</p>
              <p className="mt-1 font-semibold">{selected.repaymentPeriod}</p>
            </div>
            <div className="rounded-xl border bg-gray-50 p-4" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
              <p className="text-gray-500">Reference</p>
              <p className="mt-1 font-semibold">{selected.slug || "N/A"}</p>
            </div>
          </div>

          <div className="mt-8">
            <h2 className="text-lg font-semibold" style={{ color: BRAND_NAVY }}>Next Steps</h2>
            <ul className="mt-3 space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2"><CheckCircle2 size={16} style={{ color: BRAND_GOLD, marginTop: 2 }} /> Complete eligibility and profile details</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={16} style={{ color: BRAND_GOLD, marginTop: 2 }} /> Upload required documents</li>
              <li className="flex items-start gap-2"><CheckCircle2 size={16} style={{ color: BRAND_GOLD, marginTop: 2 }} /> Review terms and submit application</li>
            </ul>
          </div>

          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <a
              href="/eligibility"
              className="inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3 font-semibold text-white"
              style={{ backgroundColor: BRAND_NAVY }}
            >
              <FileText size={16} /> Continue Application
            </a>
            <a
              href="tel:+265997031941"
              className="inline-flex items-center justify-center gap-2 rounded-xl border px-6 py-3 font-semibold"
              style={{ borderColor: BRAND_GOLD, color: BRAND_GOLD }}
            >
              <Phone size={16} /> Talk to Loan Officer
            </a>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ApplyPage;
