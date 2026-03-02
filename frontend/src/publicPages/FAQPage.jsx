import { useState } from "react";
import { ArrowLeft, ChevronDown, ChevronUp } from "lucide-react";

const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";

const FAQ_ITEMS = [
  {
    q: "What is interest rate?",
    a: "Interest rates vary by product type, customer profile, and repayment term. Final rates are confirmed before loan acceptance.",
  },
  {
    q: "How long approval takes?",
    a: "Most applications are reviewed within 24 hours once all required details and documents are complete.",
  },
  {
    q: "Required documents?",
    a: "Typically a valid national ID, proof of income or business cashflow, and an active phone contact are required.",
  },
  {
    q: "Early repayment allowed?",
    a: "Yes, early repayment options are generally available based on your signed product terms and conditions.",
  },
  {
    q: "Are there hidden fees?",
    a: "No. All applicable fees and charges are disclosed before you confirm the loan.",
  },
];

const FAQPage = () => {
  const [openIndex, setOpenIndex] = useState(0);

  return (
    <section className="py-24 bg-gradient-to-br from-white to-gray-50 min-h-[70vh]">
      <div className="max-w-4xl mx-auto px-6">
        <a href="/" className="inline-flex items-center gap-2 text-sm font-semibold" style={{ color: BRAND_NAVY }}>
          <ArrowLeft size={16} /> Back to Home
        </a>

        <div className="mt-6 rounded-3xl border bg-white p-8 md:p-10 shadow-sm" style={{ borderColor: "rgba(0,45,91,0.12)" }}>
          <h1 className="text-3xl font-bold" style={{ color: BRAND_NAVY }}>Frequently Asked Questions</h1>
          <p className="mt-2 text-sm text-gray-600">Clear answers to common loan questions.</p>

          <div className="mt-6 space-y-3">
            {FAQ_ITEMS.map((item, index) => {
              const isOpen = openIndex === index;
              return (
                <div
                  key={item.q}
                  className="rounded-xl border bg-gray-50/70"
                  style={{ borderColor: "rgba(0,45,91,0.10)" }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? -1 : index)}
                    className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left"
                  >
                    <span className="font-semibold" style={{ color: BRAND_NAVY }}>{item.q}</span>
                    {isOpen ? <ChevronUp size={18} style={{ color: BRAND_GOLD }} /> : <ChevronDown size={18} style={{ color: BRAND_GOLD }} />}
                  </button>

                  <div
                    className={`grid transition-all duration-300 ease-in-out ${isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 pb-4 text-sm text-gray-700">{item.a}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default FAQPage;
