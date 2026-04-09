import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldCheck,
  CheckCircle,
  Phone,
  MessageCircle,
  MapPin,
  Lock,
  AlertTriangle,
} from "lucide-react";

const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";
const TRUST_IMAGE = "https://cdn.betakit.com/wp-content/uploads/2021/02/Kampus-Production-770x513.png";

const testimonials = [
  {
    name: "Grace M.",
    location: "Lilongwe",
    purpose: "SME Business Loan",
    text: "Alinafe Capital helped me expand my grocery shop within weeks. The process was simple and clear.",
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

const stats = [
  { value: 20000, suffix: "+", label: "Clients Served" },
  { value: 15, suffix: "+", label: "Branches Nationwide" },
  { value: 10, suffix: "+", label: "Years in Operation" },
];

const TrustSection = () => {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveTestimonial((prev) =>
        prev === testimonials.length - 1 ? 0 : prev + 1
      );
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const currentTestimonial = testimonials[activeTestimonial];

  return (
    <section className="relative overflow-hidden bg-white py-24">
      <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(circle_at_top_left,_rgba(179,142,70,0.14),_transparent_38%),radial-gradient(circle_at_top_right,_rgba(0,45,91,0.08),_transparent_42%)]" />

      <div className="relative mx-auto max-w-7xl px-6">
        <div className="grid items-center gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:gap-14">
          <div>
            <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.28em] text-slate-600">
              Trust & Support
            </span>
            <h2 className="mt-5 text-4xl font-bold leading-tight text-slate-950 md:text-5xl" style={{ color: BRAND_NAVY }}>
              Trusted by Communities Across Malawi
            </h2>
            <p className="mt-5 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
              Transparent lending. Responsible support. Real outcomes built around customer confidence.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:col-span-1">
                <ShieldCheck className="h-6 w-6" style={{ color: BRAND_GOLD }} />
                <p className="mt-4 text-base font-semibold text-slate-900">Licensed Institution</p>
                <p className="mt-2 text-sm text-slate-500">License No: MFI</p>
              </div>

              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <p className="text-3xl font-bold text-slate-950" style={{ color: BRAND_NAVY }}>
                    <Counter end={stat.value} suffix={stat.suffix} />
                  </p>
                  <p className="mt-2 text-sm text-slate-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-3 shadow-[0_28px_70px_rgba(15,23,42,0.10)]">
              <div className="overflow-hidden rounded-[1.5rem] bg-[linear-gradient(180deg,#f8fafc_0%,#f1f5f9_100%)]">
                <img
                  src={TRUST_IMAGE}
                  alt="Customer trust and lending support"
                  className="h-[280px] w-full object-cover sm:h-[340px] lg:h-[390px]"
                  loading="lazy"
                />
              </div>

              <div className="grid gap-3 p-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <p className="font-semibold text-slate-900">Clear process</p>
                  <p className="mt-1 text-slate-600">Transparent review and direct communication.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <p className="font-semibold text-slate-900">Secure handling</p>
                  <p className="mt-1 text-slate-600">Protected data and guided document checks.</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
                  <p className="font-semibold text-slate-900">Customer focus</p>
                  <p className="mt-1 text-slate-600">Built for Malawi households and businesses.</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[2rem] border border-slate-200 bg-slate-50 p-7 shadow-sm sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              Client Voice
            </p>
            <h3 className="mt-3 text-2xl font-bold" style={{ color: BRAND_NAVY }}>
              What our clients say
            </h3>

            <motion.p
              key={activeTestimonial}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45 }}
              className="mt-6 text-lg leading-8 text-slate-700"
            >
              "{currentTestimonial.text}"
            </motion.p>

            <div className="mt-6 text-sm text-slate-600">
              <strong className="text-slate-900">{currentTestimonial.name}</strong> - {currentTestimonial.location} ({currentTestimonial.purpose})
            </div>
          </div>

          <div className="grid gap-5">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
              <h4 className="text-xl font-bold text-slate-900">Transparency & Legal</h4>
              <ul className="mt-5 space-y-3 text-sm text-slate-600">
                <li className="flex gap-2"><CheckCircle size={16} className="mt-0.5" />Interest rates clearly disclosed</li>
                <li className="flex gap-2"><CheckCircle size={16} className="mt-0.5" />No hidden charges</li>
                <li className="flex gap-2"><CheckCircle size={16} className="mt-0.5" />Transparent repayment terms</li>
              </ul>
              <div className="mt-5 flex flex-wrap gap-4 text-sm" style={{ color: BRAND_GOLD }}>
                <a href="/interest-rates">Rates</a>
                <a href="/terms">Terms</a>
                <a href="/privacy">Privacy</a>
                <a href="/complaints">Complaints</a>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm">
              <h4 className="text-xl font-bold text-slate-900">Security & Data Protection</h4>
              <div className="mt-5 space-y-3 text-sm text-slate-600">
                <div className="flex gap-2"><Lock size={16} className="mt-0.5" />Encrypted digital forms</div>
                <div className="flex gap-2"><ShieldCheck size={16} className="mt-0.5" />Safe repayment methods</div>
                <div className="flex gap-2"><AlertTriangle size={16} className="mt-0.5" />Report fraud via official hotline</div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-16 rounded-[2rem] border border-slate-200 bg-slate-50 p-6 shadow-sm sm:p-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <h4 className="text-xl font-bold text-slate-900">Need Assistance?</h4>
              <p className="mt-2 text-sm text-slate-600">Speak to a loan officer today.</p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="tel:+265997031941"
                className="flex items-center gap-2 rounded-xl px-5 py-3 text-white"
                style={{ backgroundColor: BRAND_NAVY }}
              >
                <Phone size={16} /> Call Now
              </a>
              <a
                href="https://wa.me/265997031941"
                className="flex items-center gap-2 rounded-xl border px-5 py-3"
                style={{ borderColor: BRAND_GOLD, color: BRAND_GOLD }}
              >
                <MessageCircle size={16} /> WhatsApp
              </a>
              <a href="/branches" className="flex items-center gap-2 rounded-xl border border-slate-300 px-5 py-3 text-slate-700">
                <MapPin size={16} /> Find Branch
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default TrustSection;
