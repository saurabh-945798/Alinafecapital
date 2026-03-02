import { useState } from "react";
import { Link } from "react-router-dom";

const CATEGORIES = [
  "All",
  "KYC",
  "Profile",
  "Applications",
  "Repayments",
  "Account Security",
];

const FAQS = [
  {
    id: 1,
    category: "KYC",
    question: "Why was my KYC rejected?",
    answer: "Your document may be unclear or incomplete. Please upload a clear photo showing all details."
  },
  {
    id: 2,
    category: "Applications",
    question: "Why can't I submit my application?",
    answer: "Please complete your profile and KYC verification before applying."
  },
  {
    id: 3,
    category: "Repayments",
    question: "My payment is not updated.",
    answer: "Payments may take 1–2 business days to reflect. If still missing, contact support."
  },
  {
    id: 4,
    category: "Account Security",
    question: "How do I reset my password?",
    answer: "Go to login page and click ‘Forgot Password’ to reset securely."
  },
];

export default function DashboardHelpCenterPage() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");
  const [openId, setOpenId] = useState(null);

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory =
      activeCategory === "All" || faq.category === activeCategory;
    const matchesSearch =
      faq.question.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <section className="space-y-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">
            Help Center
          </h1>
          <p className="text-sm text-slate-500">
            Find answers about KYC, applications, repayments and more.
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <LinkButton label="Contact Officer" />
          <LinkButton label="Call Support" />
          <LinkButton label="WhatsApp" />
        </div>
      </section>

      {/* SEARCH */}
      <div>
        <input
          type="text"
          placeholder="Search help topics…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full border rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>

      {/* CATEGORY CHIPS */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`px-3 py-1.5 text-sm rounded-full border transition ${
              activeCategory === cat
                ? "bg-slate-900 text-white"
                : "bg-white hover:bg-slate-100"
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* POPULAR ISSUES */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {["KYC rejected", "Cannot submit application", "Payment not updated", "Forgot password"].map((issue) => (
          <div
            key={issue}
            className="rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition cursor-pointer"
          >
            <p className="text-sm font-medium text-slate-700">
              {issue}
            </p>
          </div>
        ))}
      </section>

      {/* FAQ ACCORDION */}
      <section className="space-y-3">
        {filteredFaqs.length > 0 ? (
          filteredFaqs.map((faq) => (
            <div
              key={faq.id}
              className="rounded-2xl border bg-white p-4 shadow-sm"
            >
              <button
                onClick={() =>
                  setOpenId(openId === faq.id ? null : faq.id)
                }
                className="w-full text-left text-sm font-semibold text-slate-800 flex justify-between"
              >
                {faq.question}
                <span>{openId === faq.id ? "-" : "+"}</span>
              </button>

              {openId === faq.id && (
                <p className="text-sm text-slate-600 mt-2">
                  {faq.answer}
                </p>
              )}
            </div>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed p-6 text-center text-sm text-slate-500">
            No result found. Try another keyword.
          </div>
        )}
      </section>

      {/* COMPLAINT SECTION */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-2">
        <h3 className="text-base font-semibold text-slate-800">
          Need more help?
        </h3>
        <p className="text-sm text-slate-600">
          Raise a complaint and our team will respond within 24 hours.
        </p>
        <Link
          to="/dashboard/complaint"
          className="inline-flex rounded-xl bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 transition"
        >
          Raise a Complaint
        </Link>
      </section>

      {/* CONTACT INFO */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-2">
        <h3 className="text-base font-semibold text-slate-800">
          Contact Information
        </h3>
        <p className="text-sm text-slate-600">
          Hotline: +265 XXX XXX XXX
        </p>
        <p className="text-sm text-slate-600">
          Email: support@yourcompany.com
        </p>
        <p className="text-sm text-slate-600">
          Office Hours: Mon–Fri, 8:00 AM – 5:00 PM
        </p>
      </section>

      {/* STATUS STRIP */}
      <section className="rounded-xl bg-slate-50 border p-3 text-xs text-slate-600 text-center">
        Average response time: 6–12 hours | Support hours: Mon–Fri
      </section>

    </div>
  );
}

function LinkButton({ label }) {
  return (
    <button className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-100 transition w-full sm:w-auto">
      {label}
    </button>
  );
}