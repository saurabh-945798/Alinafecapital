import {
  Phone,
  Mail,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Facebook,
  Linkedin,
} from "lucide-react";
import { Link } from "react-router-dom";

const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 bg-white shadow-md p-3 flex justify-between items-center md:hidden z-50">
        <span className="text-sm font-medium">Need quick help?</span>
        <a
          href="tel:+265999000000"
          className="px-4 py-2 rounded-lg text-white text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
          style={{ backgroundColor: BRAND_NAVY }}
        >
          Call Now
        </a>
      </div>

      <footer
        className="pt-20 pb-10 text-white"
        style={{
          background: `linear-gradient(180deg, ${BRAND_NAVY}, #001c3a)`,
        }}
      >
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12">
            <div>
              <h3 className="text-xl font-bold">Alinafe Capital</h3>
              <p className="mt-3 text-sm text-white/80">
                Licensed microfinance support for Malawi communities.
              </p>

              <div className="mt-4 flex items-center gap-2 text-sm">
                <ShieldCheck size={16} />
                Licensed Microfinance Institution
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Contact Us</h4>

              <div className="space-y-3 text-sm">
                <a
                  href="tel:+265999000000"
                  className="flex items-center gap-2 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded"
                >
                  <Phone size={16} />
                  +265 999 000 000
                </a>

                <a
                  href="https://wa.me/265999000000"
                  className="flex items-center gap-2 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded"
                >
                  <MessageCircle size={16} />
                  WhatsApp
                </a>

                <a
                  href="mailto:info@alinafecapital.mw"
                  className="flex items-center gap-2 hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded"
                >
                  <Mail size={16} />
                  info@alinafecapital.mw
                </a>

                <div className="flex items-start gap-2">
                  <MapPin size={16} />
                  <span>Head Office, Lilongwe, Malawi</span>
                </div>

                <p className="text-xs text-white/70">Business Hours: Mon-Fri, 8:00 AM - 5:00 PM</p>
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Compliance & Legal</h4>

              <div className="space-y-3 text-sm">
                <Link to="/interest-rates" className="hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded">
                  Interest Rates & Fees
                </Link>
                <Link to="/terms" className="hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded">
                  Terms & Conditions
                </Link>
                <Link to="/privacy" className="hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded">
                  Privacy Policy
                </Link>
                <Link to="/complaints" className="hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded">
                  Complaints Procedure
                </Link>
              </div>

              <div className="mt-4 text-xs text-white/70">
                License No: MFI-2024-001 <br />
                Regulated under applicable Malawi financial laws. <br />
                Loan approval is subject to eligibility and document verification.
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <Link to="/" className="hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded">Home</Link>
                <Link to="/about" className="hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded">About</Link>
                <Link to="/loan-products" className="hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded">Loan Products</Link>
                <Link to="/how-it-works" className="hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded">How It Works</Link>
                <Link to="/calculator" className="hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded">Calculator</Link>
                <Link to="/faq" className="hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded">FAQ</Link>
                <Link to="/branches" className="hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded">Branches</Link>
                <Link to="/complaints" className="hover:text-gray-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded">Contact / Complaints</Link>
              </div>

              <div className="mt-6">
                <p className="text-sm mb-3">Need help applying?</p>
                <a
                  href="tel:+265999000000"
                  className="inline-block px-4 py-2 rounded-lg text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{ backgroundColor: BRAND_GOLD }}
                >
                  Speak to Loan Officer
                </a>
              </div>
            </div>
          </div>

          <div className="mt-16 border-t border-white/20 pt-10">
            <div className="max-w-md">
              <h4 className="font-semibold mb-3">Stay Updated</h4>
              <label htmlFor="footer-newsletter" className="sr-only">
                Enter your email address
              </label>
              <div className="flex">
                <input
                  id="footer-newsletter"
                  type="email"
                  placeholder="Enter your email"
                  className="flex-1 px-4 py-3 rounded-l-lg text-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                />
                <button
                  type="button"
                  className="px-6 py-3 rounded-r-lg text-white font-semibold"
                  style={{ backgroundColor: BRAND_GOLD }}
                >
                  Subscribe
                </button>
              </div>
              <p className="mt-2 text-xs text-white/70">Newsletter updates will be enabled soon.</p>
            </div>
          </div>

          <div className="mt-12 border-t border-white/20 pt-6 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-white/70">
            <p>© {currentYear} Alinafe Capital. All rights reserved.</p>

            <p>Last updated: January 2026</p>

            <div className="flex gap-4">
              <a
                href="#"
                aria-label="Alinafe Capital Facebook page"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded"
              >
                <Facebook size={16} />
              </a>
              <a
                href="#"
                aria-label="Alinafe Capital LinkedIn page"
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 rounded"
              >
                <Linkedin size={16} />
              </a>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Footer;
