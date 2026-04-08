import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  FileText,
  CheckCircle,
  Phone,
  MessageCircle,
  MapPin,
  Lock,
  AlertTriangle,
} from "lucide-react";

const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";

/* ===========================================
   TESTIMONIAL DATA (Replace with real ones)
=========================================== */

const testimonials = [
  {
    name: "Grace M.",
    location: "Lilongwe",
    purpose: "SME Business Loan",
    text: "AlinafeCapital helped me expand my grocery shop within weeks. The process was simple and clear.",
  },
  {
    name: "James K.",
    location: "Blantyre",
    purpose: "Agriculture Loan",
    text: "Transparent repayment and flexible terms aligned with my farming season. Highly recommended.",
  },
  {
    name: "Mary L.",
    location: "Mzuzu",
    purpose: "Personal Loan",
    text: "Quick approval and friendly staff. I received funds within 24 hours.",
  },
];

/* ===========================================
   COUNTER COMPONENT
=========================================== */

const Counter = ({ end, suffix }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1200;
    const increment = end / (duration / 20);

    const counter = setInterval(() => {
      start += increment;
      if (start >= end) {
        setCount(end);
        clearInterval(counter);
      } else {
        setCount(Math.floor(start));
      }
    }, 20);

    return () => clearInterval(counter);
  }, [end]);

  return (
    <span>
      {count}
      {suffix}
    </span>
  );
};

/* ===========================================
   MAIN COMPONENT
=========================================== */

const TrustSection = () => {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  const nextTestimonial = () =>
    setActiveTestimonial((prev) =>
      prev === testimonials.length - 1 ? 0 : prev + 1
    );

  useEffect(() => {
    const interval = setInterval(nextTestimonial, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="relative py-24 bg-white">
      <div className="max-w-7xl mx-auto px-6">

        {/* ================= HEADER ================= */}
        <div className="text-center max-w-3xl mx-auto">
          <h2
            className="text-4xl font-bold"
            style={{ color: BRAND_NAVY }}
          >
            Trusted by Communities Across Malawi
          </h2>
          <p className="mt-4 text-gray-600">
            Transparent lending. Responsible support. Real outcomes.
          </p>
        </div>

        {/* ================= TRUST BADGES + STATS ================= */}
        <div className="mt-16 grid md:grid-cols-4 gap-8 text-center">

          <div className="bg-gray-50 p-6 rounded-2xl shadow-sm">
            <ShieldCheck size={28} className="mx-auto mb-3" />
            <p className="font-semibold">Licensed Institution</p>
            <p className="text-xs text-gray-500 mt-2">
              License No: MFI
            </p>
            <a
              href="/compliance"
              className="text-xs mt-2 inline-block"
              style={{ color: BRAND_GOLD }}
            >
              View compliance details →
            </a>
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl shadow-sm">
            <p className="text-3xl font-bold" style={{ color: BRAND_NAVY }}>
              <Counter end={20000} suffix="+" />
            </p>
            <p className="text-sm text-gray-600">Clients Served</p>
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl shadow-sm">
            <p className="text-3xl font-bold" style={{ color: BRAND_NAVY }}>
              <Counter end={15} suffix="+" />
            </p>
            <p className="text-sm text-gray-600">Branches Nationwide</p>
          </div>

          <div className="bg-gray-50 p-6 rounded-2xl shadow-sm">
            <p className="text-3xl font-bold" style={{ color: BRAND_NAVY }}>
              <Counter end={10} suffix="+" />
            </p>
            <p className="text-sm text-gray-600">Years in Operation</p>
          </div>

        </div>

        {/* ================= TESTIMONIALS ================= */}
        <div className="mt-20">
          <h3
            className="text-2xl font-bold text-center mb-10"
            style={{ color: BRAND_NAVY }}
          >
            What Our Clients Say
          </h3>

          <div className="relative max-w-3xl mx-auto bg-gray-50 p-8 rounded-2xl shadow-md">
            <motion.p
              key={activeTestimonial}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6 }}
              className="text-gray-700 text-lg"
            >
              “{testimonials[activeTestimonial].text}”
            </motion.p>

            <div className="mt-6 text-sm text-gray-600">
              <strong>
                {testimonials[activeTestimonial].name}
              </strong>{" "}
              – {testimonials[activeTestimonial].location} (
              {testimonials[activeTestimonial].purpose})
            </div>
          </div>
        </div>

        {/* ================= TRANSPARENCY ================= */}
        <div className="mt-24 grid md:grid-cols-2 gap-12">

          <div>
            <h4 className="text-xl font-bold mb-4">
              Transparency & Legal
            </h4>

            <ul className="space-y-3 text-sm">
              <li className="flex gap-2">
                <CheckCircle size={16}/> Interest Rates clearly disclosed
              </li>
              <li className="flex gap-2">
                <CheckCircle size={16}/> No hidden charges
              </li>
              <li className="flex gap-2">
                <CheckCircle size={16}/> Transparent repayment terms
              </li>
            </ul>

            <div className="mt-4 text-sm flex gap-4 flex-wrap">
              <a href="/interest-rates">Rates</a>
              <a href="/terms">Terms</a>
              <a href="/privacy">Privacy</a>
              <a href="/complaints">Complaints</a>
            </div>

            <p className="text-xs text-gray-400 mt-4">
              Rates last updated: January 2026
            </p>
          </div>

          <div>
            <h4 className="text-xl font-bold mb-4">
              Security & Data Protection
            </h4>

            <p className="text-sm text-gray-600">
              We protect your data and ensure secure transactions across all repayment channels.
            </p>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex gap-2">
                <Lock size={16}/> Encrypted digital forms
              </div>
              <div className="flex gap-2">
                <ShieldCheck size={16}/> Safe repayment methods
              </div>
              <div className="flex gap-2">
                <AlertTriangle size={16}/> Report fraud via official hotline
              </div>
            </div>
          </div>

        </div>

        {/* ================= PARTNER LOGOS ================= */}
        <div className="mt-20 text-center">
          <h4 className="text-lg font-semibold mb-6">
            Our Community & Payment Partners
          </h4>

          <div className="flex flex-wrap justify-center gap-10 opacity-70 text-gray-500 text-sm">
            <div>Bank Partner</div>
            <div>Mobile Money</div>
            <div>Community Org</div>
            <div>Agent Network</div>
          </div>
        </div>

        {/* ================= SUPPORT CTA ================= */}
        <div className="mt-24 bg-gray-100 p-8 rounded-2xl flex flex-col md:flex-row justify-between items-center gap-6">

          <div>
            <h4 className="font-semibold text-lg">
              Need Assistance?
            </h4>
            <p className="text-sm text-gray-600">
              Speak to a loan officer today.
            </p>
          </div>

          <div className="flex gap-4 flex-wrap">

            <a
              href="tel:+265997031941"
              className="flex items-center gap-2 px-6 py-3 rounded-lg text-white"
              style={{ backgroundColor: BRAND_NAVY }}
            >
              <Phone size={16}/> Call Now
            </a>

            <a
              href="https://wa.me/265997031941"
              className="flex items-center gap-2 px-6 py-3 rounded-lg border"
              style={{
                borderColor: BRAND_GOLD,
                color: BRAND_GOLD,
              }}
            >
              <MessageCircle size={16}/> WhatsApp
            </a>

            <a
              href="/branches"
              className="flex items-center gap-2 px-6 py-3 rounded-lg border"
            >
              <MapPin size={16}/> Find Branch
            </a>

          </div>

        </div>

      </div>
    </section>
  );
};

export default TrustSection;
