import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, Menu, X } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import AlinafeLogo from "./AlinafeLogo";
import { useAuth } from "../../context/AuthContext";

const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";

const MAIN_LINKS = [
  { to: "/", label: "Home", end: true },
  { to: "/about", label: "About" },
  { to: "/loan-products", label: "Loan Products" },
  { to: "/how-it-works", label: "How It Works" },
  { to: "/branches", label: "Branches" },
];

const MORE_LINKS = [
  { to: "/interest-rates", label: "Interest Rates" },
  { to: "/eligibility", label: "Eligibility" },
  { to: "/calculator", label: "Repayment Calculator" },
  { to: "/faqs", label: "FAQs" },
  { to: "/complaints", label: "Complaints" },
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/privacy", label: "Privacy Policy" },
];

const MOBILE_GROUPS = [
  { title: "Company", links: MAIN_LINKS.filter((x) => ["/", "/about", "/branches"].includes(x.to)) },
  {
    title: "Products",
    links: [
      MAIN_LINKS.find((x) => x.to === "/loan-products"),
      MORE_LINKS.find((x) => x.to === "/interest-rates"),
      MORE_LINKS.find((x) => x.to === "/eligibility"),
      MORE_LINKS.find((x) => x.to === "/calculator"),
    ].filter(Boolean),
  },
  {
    title: "Support",
    links: [
      MAIN_LINKS.find((x) => x.to === "/how-it-works"),
      MORE_LINKS.find((x) => x.to === "/faqs"),
      MORE_LINKS.find((x) => x.to === "/complaints"),
    ].filter(Boolean),
  },
  {
    title: "Legal",
    links: [
      MORE_LINKS.find((x) => x.to === "/terms"),
      MORE_LINKS.find((x) => x.to === "/privacy"),
    ].filter(Boolean),
  },
];

const mobileLinkClass = ({ isActive }) =>
  [
    "block rounded-md px-3 py-2.5 text-base font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    isActive ? "bg-slate-100" : "text-slate-700 hover:bg-slate-100",
  ].join(" ");

const desktopLinkClass = ({ isActive }) =>
  [
    "rounded-md px-2 py-1 text-base font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    isActive ? "text-[#002D5B]" : "text-slate-700 hover:text-[#002D5B]",
  ].join(" ");

const moreLinkClass = ({ isActive }) =>
  [
    "block rounded-md px-3 py-2 text-base transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
    isActive ? "bg-slate-100 text-[#002D5B]" : "text-slate-700 hover:bg-slate-100 hover:text-[#002D5B]",
  ].join(" ");

function MobileSection({ title, children }) {
  return (
    <div className="mt-4">
      <p className="px-3 pb-2 text-xs font-semibold tracking-wider text-slate-500 uppercase">{title}</p>
      <div className="flex flex-col gap-1">{children}</div>
    </div>
  );
}

export default function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout, user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [lang, setLang] = useState(() => {
    if (typeof window === "undefined") return "en";
    return localStorage.getItem("alinafe_lang") || "en";
  });

  const moreWrapRef = useRef(null);
  const moreButtonRef = useRef(null);
  const moreMenuRef = useRef(null);

  const userName = useMemo(() => {
    if (!user?.fullName) return "";
    return user.fullName.split(" ")[0];
  }, [user]);

  const isPathActive = (to, end = false) => {
    if (end || to === "/") return location.pathname === to;
    return location.pathname === to || location.pathname.startsWith(`${to}/`);
  };

  const moreMenuActive = useMemo(
    () => MORE_LINKS.some((link) => isPathActive(link.to, link.end)),
    [location.pathname]
  );

  const setLanguage = (next) => {
    setLang(next);
    try {
      localStorage.setItem("alinafe_lang", next);
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    setIsOpen(false);
    setIsMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isMoreOpen) return;

    const onPointerDown = (event) => {
      if (!moreWrapRef.current?.contains(event.target)) {
        setIsMoreOpen(false);
      }
    };

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsMoreOpen(false);
        moreButtonRef.current?.focus?.();
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown, { passive: true });
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [isMoreOpen]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const handleApply = () => {
    if (!isAuthenticated) {
      navigate(`/login?next=${encodeURIComponent("/apply")}`);
      return;
    }
    navigate("/apply");
  };

  const moreMenuId = "navbar-more-menu";

  const focusMoreItemByIndex = (index) => {
    const nodes = moreMenuRef.current?.querySelectorAll('[role="menuitem"]');
    if (!nodes || !nodes.length) return;
    const safeIndex = ((index % nodes.length) + nodes.length) % nodes.length;
    nodes[safeIndex]?.focus?.();
  };

  const openMoreAndFocus = (index = 0) => {
    setIsMoreOpen(true);
    setTimeout(() => focusMoreItemByIndex(index), 0);
  };

  return (
    <>
      <div
        className="w-full border-b text-xs sm:text-sm"
        style={{ background: "linear-gradient(90deg, rgba(0,45,91,0.08) 0%, #ffffff 100%)", borderColor: "rgba(0,45,91,0.12)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-1.5 sm:px-4 md:px-6">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-slate-700">
            <a
              href="tel:+265999000000"
              className="rounded underline-offset-2 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{ color: BRAND_NAVY }}
            >
              +265 999 000 000
            </a>
            <span className="hidden md:inline text-slate-600">Licensed Microfinance Institution - Malawi</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-slate-600">MWK</span>
            <div className="inline-flex rounded-full border bg-white p-1" style={{ borderColor: "rgba(0,45,91,0.18)" }} role="group" aria-label="Language">
              <button
                type="button"
                onClick={() => setLanguage("en")}
                className="rounded-full px-2.5 py-1 text-xs transition"
                style={lang === "en" ? { backgroundColor: BRAND_NAVY, color: "#fff" } : { color: BRAND_NAVY }}
                aria-pressed={lang === "en"}
              >
                English
              </button>
              <button
                type="button"
                onClick={() => setLanguage("ny")}
                className="rounded-full px-2.5 py-1 text-xs transition"
                style={lang === "ny" ? { backgroundColor: BRAND_NAVY, color: "#fff" } : { color: BRAND_NAVY }}
                aria-pressed={lang === "ny"}
              >
                Chichewa
              </button>
            </div>
          </div>
        </div>
      </div>

      <motion.nav
        initial={{ y: -30, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35 }}
        className="sticky top-0 z-50 border-b bg-white/95 backdrop-blur"
        style={{ borderColor: "rgba(0,45,91,0.12)" }}
      >
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-3 py-2 sm:px-4 md:px-6">
          <Link to="/" className="flex items-center" aria-label="Alinafe Capital Home">
            <AlinafeLogo
              className="h-[4.2rem] w-auto sm:h-[5rem] md:h-[5.9rem] lg:h-[6.4rem]"
              showTagline={false}
            />
          </Link>

          <div className="hidden lg:flex items-center gap-6">
            {MAIN_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.end} className={desktopLinkClass}>
                {({ isActive }) => (
                  <span className="relative inline-block">
                    {link.label}
                    <span
                      className="absolute -bottom-1 left-0 h-0.5 rounded-full transition-all"
                      style={{
                        width: isActive ? "100%" : "0%",
                        backgroundColor: BRAND_GOLD,
                      }}
                    />
                  </span>
                )}
              </NavLink>
            ))}

            <div className="relative" ref={moreWrapRef}>
              <button
                ref={moreButtonRef}
                type="button"
                onClick={() => setIsMoreOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-base font-medium text-slate-700 hover:text-[#002D5B] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                aria-haspopup="menu"
                aria-expanded={isMoreOpen}
                aria-controls={moreMenuId}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    openMoreAndFocus(0);
                  }
                  if (event.key === "ArrowUp") {
                    event.preventDefault();
                    openMoreAndFocus(MORE_LINKS.length - 1);
                  }
                }}
              >
                <span className="relative inline-block">
                  More
                  <span
                    className="absolute -bottom-1 left-0 h-0.5 rounded-full transition-all"
                    style={{
                      width: moreMenuActive ? "100%" : "0%",
                      backgroundColor: BRAND_GOLD,
                    }}
                  />
                </span>
                <ChevronDown size={16} />
              </button>

              <AnimatePresence>
                {isMoreOpen ? (
                  <motion.div
                    id={moreMenuId}
                    ref={moreMenuRef}
                    role="menu"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute left-0 top-10 z-50 w-64 rounded-lg border bg-white p-2 shadow-lg"
                    style={{ borderColor: "rgba(0,45,91,0.12)" }}
                    onKeyDown={(event) => {
                      const nodes = moreMenuRef.current?.querySelectorAll('[role="menuitem"]');
                      if (!nodes || !nodes.length) return;
                      const currentIndex = Array.from(nodes).findIndex(
                        (node) => node === document.activeElement
                      );

                      if (event.key === "ArrowDown") {
                        event.preventDefault();
                        focusMoreItemByIndex(currentIndex + 1);
                      }
                      if (event.key === "ArrowUp") {
                        event.preventDefault();
                        focusMoreItemByIndex(currentIndex - 1);
                      }
                      if (event.key === "Home") {
                        event.preventDefault();
                        focusMoreItemByIndex(0);
                      }
                      if (event.key === "End") {
                        event.preventDefault();
                        focusMoreItemByIndex(nodes.length - 1);
                      }
                      if (event.key === "Escape") {
                        event.preventDefault();
                        setIsMoreOpen(false);
                        moreButtonRef.current?.focus?.();
                      }
                    }}
                  >
                    {MORE_LINKS.map((link) => (
                      <NavLink key={link.to} to={link.to} className={moreLinkClass} role="menuitem" onClick={() => setIsMoreOpen(false)}>
                        {link.label}
                      </NavLink>
                    ))}
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {userName ? <span className="text-xs text-slate-600">Hi, {userName}</span> : null}
                <NavLink
                  to="/dashboard"
                  className="rounded-lg border px-4 py-2 text-base font-medium transition"
                  style={{ borderColor: BRAND_NAVY, color: BRAND_NAVY }}
                >
                  Dashboard
                </NavLink>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="rounded-lg border border-slate-300 px-4 py-2 text-base font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Logout
                </button>
              </>
            ) : (
              <NavLink
                to="/login"
                className="rounded-lg border px-4 py-2 text-base font-medium transition"
                style={{ borderColor: BRAND_NAVY, color: BRAND_NAVY }}
              >
                 Login
              </NavLink>
            )}

            <button
              type="button"
              onClick={handleApply}
              className="rounded-lg border px-5 py-2 text-base font-semibold transition hover:opacity-95"
              style={{
                color: BRAND_NAVY,
                borderColor: "rgba(0,45,91,0.25)",
                background: "linear-gradient(135deg, #ffffff 0%, #e8f1ff 100%)",
              }}
            >
              Apply Loan
            </button>
          </div>

          <button
            className="lg:hidden rounded-md border p-2 text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{ borderColor: "rgba(0,45,91,0.2)" }}
            onClick={() => setIsOpen((prev) => !prev)}
            aria-label={isOpen ? "Close menu" : "Open menu"}
            aria-expanded={isOpen}
            aria-controls="mobile-nav-panel"
          >
            {isOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        <AnimatePresence>
          {isOpen ? (
            <>
              <motion.button
                type="button"
                className="fixed inset-0 z-40 bg-black/35 lg:hidden"
                aria-label="Close menu overlay"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
              />

              <motion.div
                id="mobile-nav-panel"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className="absolute inset-x-0 top-full z-50 border-t bg-white shadow-xl lg:hidden"
                style={{ borderColor: "rgba(0,45,91,0.12)" }}
              >
                <div className="mx-auto max-w-7xl px-3 pb-5 sm:px-4">
                  <div className="mt-2 max-h-[72vh] overflow-y-auto pb-1">
                    {MOBILE_GROUPS.map((group) => (
                      <MobileSection key={group.title} title={group.title}>
                        {group.links.map((link) => (
                          <NavLink
                            key={link.to}
                            to={link.to}
                            end={link.end}
                            className={mobileLinkClass}
                            style={({ isActive }) =>
                              isActive
                                ? { color: BRAND_NAVY, backgroundColor: "rgba(0,45,91,0.08)" }
                                : undefined
                            }
                            onClick={() => setIsOpen(false)}
                          >
                            {link.label}
                          </NavLink>
                        ))}
                      </MobileSection>
                    ))}

                    <div className="mt-5 flex flex-col gap-3 border-t border-slate-200 pt-4">
                      {isAuthenticated ? (
                        <>
                          <NavLink
                            to="/dashboard"
                            onClick={() => setIsOpen(false)}
                            className="rounded-lg border px-4 py-2.5 text-center text-base font-medium"
                            style={{ borderColor: BRAND_NAVY, color: BRAND_NAVY }}
                          >
                            Dashboard
                          </NavLink>
                          <button
                            type="button"
                            onClick={() => {
                              setIsOpen(false);
                              handleLogout();
                            }}
                            className="rounded-lg border border-slate-300 px-4 py-2.5 text-center text-base font-medium text-slate-700"
                          >
                            Logout
                          </button>
                        </>
                      ) : (
                        <NavLink
                          to="/login"
                          onClick={() => setIsOpen(false)}
                          className="rounded-lg border px-4 py-2.5 text-center text-base font-medium"
                          style={{ borderColor: BRAND_NAVY, color: BRAND_NAVY }}
                        >
                          Client Login
                        </NavLink>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setIsOpen(false);
                          handleApply();
                        }}
                        className="rounded-lg border px-4 py-2.5 text-center text-base font-semibold"
                        style={{
                          color: BRAND_NAVY,
                          borderColor: "rgba(0,45,91,0.25)",
                          background: "linear-gradient(135deg, #ffffff 0%, #e8f1ff 100%)",
                        }}
                      >
                        Apply Loan
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            </>
          ) : null}
        </AnimatePresence>
      </motion.nav>
    </>
  );
}
