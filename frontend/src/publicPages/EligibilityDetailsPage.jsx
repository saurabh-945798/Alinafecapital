import { ArrowLeft, CheckCircle2 } from "lucide-react";

const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";

const CRITERIA = [
  {
    title: "Minimum Income",
    detail: "Applicant should have stable monthly income that can support proposed repayment.",
  },
  {
    title: "Employment Required",
    detail: "Applicant should be formally employed, self-employed, or have verifiable business cashflow.",
  },
  {
    title: "Age Range",
    detail: "Applicant must be between 18 and 65 years (subject to product policy).",
  },
  {
    title: "Valid ID Required",
    detail: "A valid national identification document is required for all applications.",
  },
];

const EligibilityDetailsPage = () => {
  return (
    <section className="py-24 bg-gradient-to-br from-white to-gray-50 min-h-[70vh]">
      <div className="max-w-5xl mx-auto px-6">
        <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: BRAND_NAVY }}>
          <ArrowLeft size={16} /> Back to Home
        </a>

        <div className="mt-6 rounded-3xl border bg-white p-8 md:p-10 shadow-sm" style={{ borderColor: "rgba(0,45,91,0.12)" }}>
          <h1 className="text-3xl font-bold" style={{ color: BRAND_NAVY }}>Full Eligibility Details</h1>
          <p className="mt-2 text-sm text-gray-600">Review the primary requirements before starting your application.</p>

          <div className="mt-8 grid sm:grid-cols-2 gap-4">
            {CRITERIA.map((item) => (
              <article
                key={item.title}
                className="rounded-2xl border p-5 bg-gray-50/70"
                style={{ borderColor: "rgba(0,45,91,0.10)" }}
              >
                <h2 className="text-lg font-semibold inline-flex items-center gap-2" style={{ color: BRAND_NAVY }}>
                  <CheckCircle2 size={18} style={{ color: BRAND_GOLD }} />
                  {item.title}
                </h2>
                <p className="mt-2 text-sm text-gray-700">{item.detail}</p>
              </article>
            ))}
          </div>

          <a
            href="/apply"
            className="mt-8 inline-flex rounded-xl px-6 py-3 text-white font-semibold"
            style={{ backgroundColor: BRAND_NAVY }}
          >
            Start Application
          </a>
        </div>
      </div>
    </section>
  );
};

export default EligibilityDetailsPage;
