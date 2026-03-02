import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  MousePointer2,
  FileText,
  ShieldCheck,
  Banknote,
  CreditCard,
  Phone,
  CheckCircle,
  HelpCircle,
  BadgeCheck,
} from "lucide-react";

const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";

const steps = [
  {
    id: 1,
    title: "Choose",
    desc: "Pick the loan product and amount in MWK.",
    time: "2 min",
    icon: <MousePointer2 size={22} />,
  },
  {
    id: 2,
    title: "Apply",
    desc: "Fill a short digital form securely.",
    time: "5 min",
    icon: <FileText size={22} />,
  },
  {
    id: 3,
    title: "Review",
    desc: "We verify and confirm terms with you.",
    time: "24h",
    icon: <ShieldCheck size={22} />,
  },
  {
    id: 4,
    title: "Receive",
    desc: "Get funds by bank, mobile money, or branch.",
    time: "Same day",
    icon: <Banknote size={22} />,
  },
  {
    id: 5,
    title: "Repay",
    desc: "Pay weekly or monthly using digital channels.",
    time: "Flexible",
    icon: <CreditCard size={22} />,
  },
];

const HowItWorks = () => {
  const navigate = useNavigate();

  return (
    <section
      className="relative py-24 overflow-hidden"
      aria-label="How it works"
      style={{
        background:
          "linear-gradient(135deg, rgba(0,45,91,0.06) 0%, rgba(0,45,91,0.03) 40%, rgba(255,255,255,1) 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-3xl mx-auto">
          <p
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full border bg-white/70 backdrop-blur"
            style={{ borderColor: "rgba(0,45,91,0.12)", color: BRAND_NAVY }}
          >
            <BadgeCheck size={16} />
            Simple, transparent process
          </p>

          <h2 className="mt-6 text-4xl font-bold" style={{ color: BRAND_NAVY }}>
            How It Works
          </h2>

          <p className="mt-4 text-gray-600 text-lg">
            Apply in minutes, get clear terms, repay with confidence.
          </p>

          <p className="mt-2 text-sm text-gray-500">Final terms are shared before acceptance.</p>
        </div>

        <div className="mt-16 relative">
          <div
            className="hidden lg:block absolute top-12 left-0 right-0 h-1 bg-gray-200 rounded-full"
            aria-hidden="true"
          >
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "100%" }}
              viewport={{ once: true }}
              transition={{ duration: 1 }}
              className="h-1 rounded-full"
              style={{ backgroundColor: BRAND_GOLD }}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {steps.map((step, index) => {
              const isActive = step.id === 1;

              return (
                <motion.div
                  key={step.id}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: index * 0.12 }}
                  className="relative bg-white p-6 rounded-2xl shadow-md hover:shadow-xl transition group focus-within:shadow-xl"
                  style={{
                    border: "1px solid rgba(0,45,91,0.10)",
                    ...(isActive && {
                      boxShadow: "0 20px 45px rgba(0,45,91,0.18)",
                      borderColor: "rgba(179,142,70,0.60)",
                    }),
                  }}
                  aria-label={`Step ${step.id}: ${step.title}`}
                >
                  <div
                    className="absolute -top-5 left-6 w-10 h-10 rounded-full flex items-center justify-center text-white font-bold shadow-md"
                    style={{
                      backgroundColor: isActive ? BRAND_GOLD : BRAND_NAVY,
                    }}
                    aria-hidden="true"
                  >
                    {step.id}
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <div
                      className="p-3 rounded-lg text-white"
                      style={{
                        backgroundColor: isActive ? BRAND_NAVY : BRAND_GOLD,
                      }}
                      aria-hidden="true"
                    >
                      {step.icon}
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-semibold text-lg leading-tight" style={{ color: BRAND_NAVY }}>
                        {step.title}
                      </h3>
                      <p
                        className="mt-1 text-xs font-semibold inline-flex items-center px-2 py-1 rounded-full border"
                        style={{
                          borderColor: "rgba(0,45,91,0.12)",
                          backgroundColor: "rgba(0,45,91,0.04)",
                          color: BRAND_NAVY,
                        }}
                      >
                        {step.time}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-gray-600">{step.desc}</p>

                  <div className="lg:hidden mt-4">
                    <div className="h-1 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-1 rounded-full"
                        style={{
                          width: `${(step.id / steps.length) * 100}%`,
                          backgroundColor: BRAND_GOLD,
                        }}
                        aria-hidden="true"
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="mt-12 flex justify-center">
            <button
              type="button"
              role="button"
              onClick={() => navigate("/eligibility-check")}
              className="px-8 py-4 rounded-xl border font-semibold inline-flex items-center justify-center focus:outline-none focus:ring-4 transition-all duration-200 hover:bg-[#fff7e8]"
              style={{
                borderColor: BRAND_GOLD,
                color: BRAND_GOLD,
                backgroundColor: "rgba(255,255,255,0.9)",
              }}
              aria-label="Check eligibility"
            >
              Check Eligibility
            </button>
          </div>

          
        </div>

        <div className="mt-20 grid md:grid-cols-3 gap-8">
          <div
            className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition"
            style={{ border: "1px solid rgba(0,45,91,0.10)" }}
            aria-label="What you need"
          >
            <h4 className="text-xl font-bold mb-4" style={{ color: BRAND_NAVY }}>
              What you need
            </h4>

            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex gap-2 items-start">
                <CheckCircle size={16} style={{ color: BRAND_GOLD, marginTop: 2 }} />
                Valid National ID
              </li>
              <li className="flex gap-2 items-start">
                <CheckCircle size={16} style={{ color: BRAND_GOLD, marginTop: 2 }} />
                Proof of income or business activity
              </li>
              <li className="flex gap-2 items-start">
                <CheckCircle size={16} style={{ color: BRAND_GOLD, marginTop: 2 }} />
                Active phone number
              </li>
            </ul>

            <button
              type="button"
              role="button"
              onClick={() => navigate("/eligibility-details")}
              className="inline-block mt-5 font-semibold focus:outline-none focus:ring-4 rounded-lg px-3 py-2 transition-colors duration-200 hover:bg-amber-50"
              style={{ color: BRAND_GOLD }}
              aria-label="View full eligibility requirements"
            >
              View Full Eligibility →
            </button>
          </div>

          <div
            className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition"
            style={{ border: "1px solid rgba(0,45,91,0.10)" }}
            aria-label="How you get funds"
          >
            <h4 className="text-xl font-bold mb-4" style={{ color: BRAND_NAVY }}>
              How you get funds
            </h4>

            <p className="text-sm text-gray-600">
              Most applications are reviewed within 24 hours. Funds can be disbursed via:
            </p>

            <ul className="mt-4 space-y-2 text-sm text-gray-700">
              <li>• Bank transfer</li>
              <li>• Mobile money</li>
              <li>• Cash at branch</li>
            </ul>

            <p className="mt-4 text-xs text-gray-500">
              Applications submitted on weekends or public holidays are processed next working day.
            </p>
          </div>

          <div
            className="bg-white p-8 rounded-2xl shadow-md hover:shadow-xl transition"
            style={{ border: "1px solid rgba(0,45,91,0.10)" }}
            aria-label="How to repay"
          >
            <h4 className="text-xl font-bold mb-4" style={{ color: BRAND_NAVY }}>
              How to repay
            </h4>

            <p className="text-sm text-gray-600">
              Choose weekly or monthly schedules, and pay using convenient channels:
            </p>

            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border bg-gray-50 px-3 py-2" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
                Branch payment
              </div>
              <div className="rounded-xl border bg-gray-50 px-3 py-2" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
                Agent collection
              </div>
              <div className="rounded-xl border bg-gray-50 px-3 py-2" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
                Bank transfer
              </div>
              <div className="rounded-xl border bg-gray-50 px-3 py-2" style={{ borderColor: "rgba(0,45,91,0.10)" }}>
                Mobile money
              </div>
            </div>

            <p className="mt-4 text-sm text-gray-600">SMS reminders and support available for every client.</p>

            
          </div>
        </div>

        <div
          className="mt-16 bg-white/80 backdrop-blur p-6 rounded-2xl border flex flex-col md:flex-row justify-between items-center gap-6 text-sm"
          style={{ borderColor: "rgba(0,45,91,0.10)" }}
          aria-label="Trust and support"
        >
          <div className="flex gap-3 flex-wrap justify-center md:justify-start">
            <span
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full border bg-white"
              style={{ borderColor: "rgba(0,45,91,0.12)", color: BRAND_NAVY }}
            >
              <ShieldCheck size={16} />
              Licensed
            </span>
            <span
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full border bg-white"
              style={{ borderColor: "rgba(0,45,91,0.12)", color: BRAND_NAVY }}
            >
              Transparent Fees
            </span>
            <span
              className="inline-flex items-center gap-2 px-3 py-2 rounded-full border bg-white"
              style={{ borderColor: "rgba(0,45,91,0.12)", color: BRAND_NAVY }}
            >
              No Hidden Charges
            </span>
          </div>

          <a
            href="tel:+265999000000"
            className="inline-flex items-center justify-center gap-2 font-semibold px-5 py-3 rounded-xl focus:outline-none focus:ring-4"
            style={{
              backgroundColor: BRAND_NAVY,
              color: "#fff",
              boxShadow: "0 18px 40px rgba(0,45,91,0.18)",
            }}
            aria-label="Talk to a loan officer"
          >
            <Phone size={16} />
            Talk to Loan Officer
          </a>
        </div>

        <div
          className="mt-14 rounded-2xl p-6 border"
          style={{
            borderColor: "rgba(0,45,91,0.12)",
            background:
              "linear-gradient(135deg, rgba(0,45,91,0.06) 0%, rgba(179,142,70,0.10) 100%)",
          }}
          aria-label="Conversion strip"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm font-semibold text-center sm:text-left" style={{ color: BRAND_NAVY }}>
              Apply in 5 minutes • Review in 24 hours • Clear terms before acceptance
            </p>
            <button
              type="button"
              role="button"
              onClick={() => navigate("/faq")}
              className="px-8 py-4 rounded-xl border font-semibold inline-flex items-center justify-center focus:outline-none focus:ring-4 transition-all duration-200 hover:bg-[#fff7e8]"
              style={{
                borderColor: BRAND_GOLD,
                color: BRAND_GOLD,
                backgroundColor: "rgba(255,255,255,0.9)",
              }}
              aria-label="Open FAQs from conversion strip"
            >
              See FAQs
            </button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
