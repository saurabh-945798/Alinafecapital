import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";

const BRAND_NAVY = "#002D5B";

const quickLinks = [
  { label: "Home", href: "/" },
  { label: "About", href: "/about" },
  { label: "Loan Products", href: "/loan-products" },
  { label: "How It Works", href: "/how-it-works" },
  { label: "Calculator", href: "/calculator" },
  { label: "Branches", href: "/branches" },
];

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-between bg-white p-3 shadow-md md:hidden">
        <span className="text-sm font-medium">Need quick help?</span>
        <a
          href="tel:+265997031941"
          className="rounded-lg px-4 py-2 text-sm text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ backgroundColor: BRAND_NAVY }}
        >
          Call Now
        </a>
      </div>

      <footer
        className="pb-8 pt-14 text-white"
        style={{ background: `linear-gradient(180deg, ${BRAND_NAVY}, #001f40)` }}
      >
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.95fr_0.95fr]">
            <div>
              <h3 className="text-2xl font-bold">Alinafe Capital</h3>
              <div className="mt-3 w-full max-w-[220px] overflow-hidden rounded-full bg-white/15">
                <div className="h-[2px] w-full animate-[footerBrandDividerShift_3.4s_ease-in-out_infinite] bg-[linear-gradient(90deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.92)_28%,rgba(179,142,70,0.95)_50%,rgba(255,255,255,0.92)_72%,rgba(255,255,255,0.18)_100%)]" />
              </div>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.28em] text-white/70">
                Financial Services
              </p>
              <p className="mt-3 max-w-md text-sm leading-7 text-white/80">
                Clear lending support for Malawi customers with practical products, transparent communication, and guided follow-up.
              </p>

              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm text-white/85">
                <ShieldCheck size={16} />
                Licensed Microfinance Institution
              </div>

              <p className="mt-5 max-w-md text-xs leading-6 text-white/65">
                ALINAFE CAPITAL is a limited company registered by the Registrar of Companies in Malawi.
                Company No.: COY-7WULNGE.
              </p>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-white/75">
                Contact
              </h4>

              <div className="mt-5 space-y-3 text-sm text-white/85">
                <a
                  href="tel:+265997031941"
                  className="flex items-center gap-3 rounded-lg transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <Phone size={16} />
                  +265 997 031 941
                </a>
                <a
                  href="https://wa.me/265997031941"
                  className="flex items-center gap-3 rounded-lg transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <MessageCircle size={16} />
                  WhatsApp Support
                </a>
                <a
                  href="mailto:info@alinafecapital.com"
                  className="flex items-center gap-3 rounded-lg transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                >
                  <Mail size={16} />
                  info@alinafecapital.com
                </a>
                <div className="flex items-start gap-3 text-white/75">
                  <MapPin size={16} className="mt-0.5" />
                  <span>Head Office, Lilongwe, Malawi</span>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-sm font-semibold uppercase tracking-[0.24em] text-white/75">
                Quick Links
              </h4>

              <div className="mt-5 grid grid-cols-2 gap-3 text-sm text-white/85">
                {quickLinks.map((link) => (
                  <Link
                    key={link.href}
                    to={link.href}
                    className="rounded transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link to="/privacy" className="rounded transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
                  Privacy
                </Link>
                <Link to="/terms" className="rounded transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
                  Terms
                </Link>
                <Link to="/complaints" className="rounded transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
                  Complaints
                </Link>
                <Link to="/interest-rates" className="rounded transition hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2">
                  Interest Rates
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-10 flex flex-col gap-3 border-t border-white/15 pt-6 text-xs text-white/60 md:flex-row md:items-center md:justify-between">
            <p>© {currentYear} Alinafe Capital. All rights reserved.</p>
            <p>Mon-Fri, 8:00 AM - 5:00 PM</p>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes footerBrandDividerShift {
          0% { transform: translateX(-18%); opacity: 0.75; }
          50% { transform: translateX(18%); opacity: 1; }
          100% { transform: translateX(-18%); opacity: 0.75; }
        }
      `}</style>
    </>
  );
};

export default Footer;
