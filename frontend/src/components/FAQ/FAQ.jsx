import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Phone,
  MessageCircle,
  MapPin,
} from "lucide-react";

const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";

/* =========================================================
   FAQ DATA
========================================================= */

const faqData = [
  {
    id: "faq-1",
    category: "Eligibility",
    question: "Who qualifies for a loan?",
    answer:
      "Applicants must be 18 years or older, have a valid national ID, and show proof of income or business activity in Malawi.",
  },
  {
    id: "faq-2",
    category: "Eligibility",
    question: "What documents do I need?",
    answer:
      "A valid national ID, proof of income or business registration, and an active phone number for communication.",
  },
  {
    id: "faq-3",
    category: "Application",
    question: "How long does approval take?",
    answer:
      "Most applications are reviewed within 24 hours during working days. Weekend submissions are processed next business day.",
  },
  {
    id: "faq-4",
    category: "Rates & Fees",
    question: "What are the interest rates and fees?",
    answer:
      "Interest rates depend on the loan type and term. All fees are disclosed clearly before you sign your agreement.",
  },
  {
    id: "faq-5",
    category: "Rates & Fees",
    question: "Are there hidden charges?",
    answer:
      "No. We operate transparently and clearly disclose all applicable charges before loan approval.",
  },
  {
    id: "faq-6",
    category: "Repayment",
    question: "Can I repay my loan early?",
    answer:
      "Yes. Early repayment is allowed. Please confirm if any early settlement terms apply for your specific product.",
  },
  {
    id: "faq-7",
    category: "Repayment",
    question: "What happens if I miss a payment?",
    answer:
      "Late payments may incur penalties. Contact us immediately to discuss a repayment solution.",
  },
  {
    id: "faq-8",
    category: "Security & Complaints",
    question: "How do I submit a complaint?",
    answer:
      "You may submit complaints via our branch offices, hotline, or official email. We respond within defined service timelines.",
  },
  {
    id: "faq-9",
    category: "Security & Complaints",
    question: "Is my personal data safe?",
    answer:
      "Yes. We use secure systems and protect your personal data in line with applicable regulations.",
  },
];

const categories = [
  "All",
  "Eligibility",
  "Rates & Fees",
  "Application",
  "Repayment",
  "Security & Complaints",
];

/* =========================================================
   COMPONENT
========================================================= */

const FAQ = () => {
  const [activeCategory, setActiveCategory] =
    useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [openId, setOpenId] = useState(null);

  /* ================= URL HASH SUPPORT ================= */

  useEffect(() => {
    const hash = window.location.hash;
    if (hash) {
      setOpenId(hash.replace("#", ""));
    }
  }, []);

  /* ================= FILTER + SEARCH ================= */

  const filteredFaq = useMemo(() => {
    return faqData.filter((faq) => {
      const matchesCategory =
        activeCategory === "All" ||
        faq.category === activeCategory;

      const matchesSearch =
        faq.question
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        faq.answer
          .toLowerCase()
          .includes(searchTerm.toLowerCase());

      return matchesCategory && matchesSearch;
    });
  }, [activeCategory, searchTerm]);

  const highlightText = (text) => {
    if (!searchTerm) return text;

    const regex = new RegExp(
      `(${searchTerm})`,
      "gi"
    );

    return text.split(regex).map((part, i) =>
      part.toLowerCase() ===
      searchTerm.toLowerCase() ? (
        <mark
          key={i}
          className="bg-yellow-200 px-1 rounded"
        >
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">

        {/* ================= HEADER ================= */}
        <div className="text-center max-w-3xl mx-auto">
          <h2
            className="text-4xl font-bold"
            style={{ color: BRAND_NAVY }}
          >
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-gray-600">
            Clear answers before you apply.
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Transparent lending for Malawi communities.
          </p>
        </div>

        {/* ================= SEARCH ================= */}
        <div className="mt-10 max-w-2xl mx-auto relative">
          <Search className="absolute left-3 top-3 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search questions..."
            value={searchTerm}
            onChange={(e) =>
              setSearchTerm(e.target.value)
            }
            className="w-full border rounded-lg pl-10 pr-4 py-3"
          />
        </div>

        {/* ================= CATEGORY TABS ================= */}
        <div className="mt-8 flex gap-3 flex-wrap justify-center">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full text-sm ${
                activeCategory === cat
                  ? "text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
              style={
                activeCategory === cat
                  ? { backgroundColor: BRAND_NAVY }
                  : {}
              }
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ================= MAIN LAYOUT ================= */}
        <div className="mt-16 grid lg:grid-cols-3 gap-12">

          {/* FAQ ACCORDION */}
          <div className="lg:col-span-2 space-y-4">

            {filteredFaq.map((faq) => {
              const isOpen = openId === faq.id;

              return (
                <div
                  key={faq.id}
                  className="border rounded-xl p-5"
                >
                  <button
                    onClick={() =>
                      setOpenId(
                        isOpen ? null : faq.id
                      )
                    }
                    aria-expanded={isOpen}
                    aria-controls={faq.id}
                    className="w-full text-left font-medium focus:outline-none"
                  >
                    {highlightText(faq.question)}
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div
                        id={faq.id}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{
                          height: "auto",
                          opacity: 1,
                        }}
                        exit={{
                          height: 0,
                          opacity: 0,
                        }}
                        transition={{
                          duration: 0.3,
                        }}
                        className="overflow-hidden mt-3 text-sm text-gray-600"
                      >
                        {highlightText(faq.answer)}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}

          </div>

          {/* HELP SIDEBAR */}
          <div className="bg-gray-50 p-6 rounded-2xl shadow-sm h-fit">
            <h3 className="text-lg font-semibold mb-4">
              Still have questions?
            </h3>

            <div className="flex flex-col gap-4">

              <a
                href="tel:+265999000000"
                className="flex items-center gap-2 px-4 py-3 rounded-lg text-white"
                style={{ backgroundColor: BRAND_NAVY }}
              >
                <Phone size={16}/> Talk to Loan Officer
              </a>

              <a
                href="https://wa.me/265999000000"
                className="flex items-center gap-2 px-4 py-3 rounded-lg border"
                style={{
                  borderColor: BRAND_GOLD,
                  color: BRAND_GOLD,
                }}
              >
                <MessageCircle size={16}/> WhatsApp Us
              </a>

              <a
                href="/branches"
                className="flex items-center gap-2 px-4 py-3 rounded-lg border"
              >
                <MapPin size={16}/> Visit Branch
              </a>

            </div>

            {/* Policy Links */}
            <div className="mt-6 text-sm text-gray-600 space-y-2">
              <a href="/terms">Terms & Conditions</a>
              <a href="/privacy">Privacy Policy</a>
              <a href="/interest-rates">Interest Rates</a>
              <a href="/complaints">Complaints Procedure</a>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
};

export default FAQ;
