import { motion } from "framer-motion";
import { Link, useNavigate } from "react-router-dom";
import {
  Phone,
  MessageCircle,
  MapPin,
  ShieldCheck,
  CheckCircle,
  Clock,
} from "lucide-react";
import { guardStartApplication } from "../../utils/applyGuard";
import { api } from "../../services/api";

const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";

const FinalCTA = () => {
  const navigate = useNavigate();

  /* =========================
     Simple CTA Click Tracker
  ========================= */
  const trackClick = (label) => {
    if (typeof window !== "undefined" && window.console) {
      console.log("CTA Clicked:", label);
    }
    // Later connect to analytics
  };

  const handleApply = () => {
    trackClick("Apply Loan");
    guardStartApplication({ navigate, api });
  };

  return (
    <section className="relative py-24 px-6 overflow-hidden">
      {/* Background Gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(135deg, ${BRAND_NAVY} 0%, #001c3a 60%, ${BRAND_GOLD} 140%)`,
        }}
      />

      <div className="relative max-w-7xl mx-auto">

        {/* Rounded Premium Container */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-3xl p-10 shadow-2xl"
        >
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            {/* ================= LEFT SIDE ================= */}
            <div className="text-white max-w-xl">

              <h2 className="text-3xl sm:text-4xl font-bold leading-tight">
                Ready to Grow with Alinafe Capital?
              </h2>

              <p className="mt-4 text-white/90">
                Fast, transparent, and supportive lending designed for Malawi communities.
              </p>

              <p className="mt-3 text-sm text-white/80">
                Trusted by 20,000+ clients across Malawi · Licensed microfinance institution
              </p>

              {/* Urgency Strip */}
              <div className="mt-6 flex flex-wrap gap-4 text-sm">
                <span className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-full">
                  <Clock size={16} /> Application takes ~5 minutes
                </span>
                <span className="flex items-center gap-2 bg-white/20 px-3 py-2 rounded-full">
                  <CheckCircle size={16} /> Response within 24 hours
                </span>
              </div>

            </div>

            {/* ================= RIGHT SIDE ================= */}
            <div className="flex flex-col gap-6">

              {/* Primary CTA */}
              <button
                onClick={handleApply}
                className="w-full py-4 rounded-xl text-white font-semibold text-lg shadow-lg transition hover:scale-[1.02]"
                style={{ backgroundColor: BRAND_GOLD }}
              >
                Apply in 5 Minutes
              </button>

              {/* Secondary CTA */}
              <a
                href="tel:+265999000000"
                onClick={() => trackClick("Talk Loan Officer")}
                className="w-full py-4 rounded-xl border border-white text-white font-semibold text-center hover:bg-white/10 transition"
              >
                Talk to a Loan Officer
              </a>

              {/* Tertiary Link */}
              <Link
                to="/interest-rates"
                onClick={() => trackClick("View Rates")}
                className="text-sm text-white/80 text-center underline"
              >
                View Rates & Fees
              </Link>

              {/* Trust Chips */}
              <div className="flex flex-wrap gap-3 justify-center lg:justify-start text-xs text-white/90">
                <span className="bg-white/15 px-3 py-2 rounded-full flex items-center gap-2">
                  <ShieldCheck size={14}/> No hidden charges
                </span>
                <span className="bg-white/15 px-3 py-2 rounded-full">
                  MWK-friendly repayment plans
                </span>
                <span className="bg-white/15 px-3 py-2 rounded-full">
                  Data privacy protected
                </span>
              </div>

              {/* Contact Micro Block */}
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start mt-4">

                <a
                  href="tel:+265999000000"
                  className="flex items-center gap-2 text-white text-sm"
                >
                  <Phone size={16}/> +265 999 000 000
                </a>

                <a
                  href="https://wa.me/265999000000"
                  className="flex items-center gap-2 text-white text-sm"
                >
                  <MessageCircle size={16}/> WhatsApp
                </a>

                <Link
                  to="/branches"
                  className="flex items-center gap-2 text-white text-sm"
                >
                  <MapPin size={16}/> Find Branch
                </Link>

              </div>

            </div>

          </div>
        </motion.div>

      </div>
    </section>
  );
};

export default FinalCTA;
