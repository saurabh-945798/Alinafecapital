import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronRight, Menu, X } from "lucide-react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import logoImage from "../../../images/logo.png";
import { useAuth } from "../../context/AuthContext.jsx";
import { useLanguage } from "../../context/LanguageContext.jsx";

const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";
const DESKTOP_BREAKPOINT = 1024;
const DROPDOWN_CLOSE_DELAY_MS = 180;

const MAIN_LINKS = [
  { to: "/", labelKey: "navbar.home" },
  { to: "/about", labelKey: "navbar.about" },
  { to: "/loan-products", labelKey: "navbar.loanProducts" },
  { to: "/how-it-works", labelKey: "navbar.howItWorks" },
  { to: "/branches", labelKey: "navbar.branches" },
];

const MORE_SECTIONS = [
  {
    titleKey: "navbar.tools",
    items: [
      { to: "/interest-rates", labelKey: "navbar.interestRates" },
      { to: "/eligibility", labelKey: "navbar.eligibility" },
      { to: "/calculator", labelKey: "navbar.calculator" },
    ],
  },
  {
    titleKey: "navbar.support",
    items: [
      { to: "/faq", labelKey: "navbar.faqs" },
      { to: "/complaints", labelKey: "navbar.complaints" },
    ],
  },
  {
    titleKey: "navbar.legal",
    items: [
      { to: "/terms", labelKey: "navbar.terms" },
      { to: "/privacy", labelKey: "navbar.privacy" },
    ],
  },
];

const MOBILE_PRIMARY_SECTIONS = [
  {
    titleKey: "navbar.company",
    links: [
      { to: "/", labelKey: "navbar.home" },
      { to: "/about", labelKey: "navbar.about" },
      { to: "/branches", labelKey: "navbar.branches" },
    ],
  },
  {
    titleKey: "navbar.products",
    links: [
      { to: "/loan-products", labelKey: "navbar.loanProducts" },
      { to: "/how-it-works", labelKey: "navbar.howItWorks" },
    ],
  },
];

function MobileSection({ title, children }) {
  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
        {title}
      </p>
      <div className="mt-3 space-y-2">{children}</div>
    </section>
  );
}

function DropdownMenu({ label, sections, pathname, t, isDesktop }) {
  const [hoverOpen, setHoverOpen] = useState(false);
  const [clickOpen, setClickOpen] = useState(false);
  const wrapperRef = useRef(null);
  const closeTimerRef = useRef(null);

  const open = hoverOpen || clickOpen;
  const hasActiveChild = sections.some((section) =>
    section.items.some((item) => pathname === item.to)
  );

  const clearCloseTimer = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

  const closeAll = () => {
    clearCloseTimer();
    setHoverOpen(false);
    setClickOpen(false);
  };

  const scheduleHoverClose = () => {
    if (!isDesktop) return;
    clearCloseTimer();
    closeTimerRef.current = window.setTimeout(() => {
      setHoverOpen(false);
    }, DROPDOWN_CLOSE_DELAY_MS);
  };

  const handleMouseEnter = () => {
    if (!isDesktop) return;
    clearCloseTimer();
    setHoverOpen(true);
  };

  useEffect(() => {
    closeAll();
  }, [pathname]);

  useEffect(() => {
    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        closeAll();
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        closeAll();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      clearCloseTimer();
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isDesktop]);

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={scheduleHoverClose}
    >
      <button
        type="button"
        onClick={() => {
          clearCloseTimer();
          setClickOpen((prev) => !prev);
          if (isDesktop) {
            setHoverOpen(true);
          }
        }}
        className={[
          "inline-flex min-h-11 items-center gap-2 rounded-full px-3 py-2.5 text-[13px] font-semibold transition-all duration-200 ease-out xl:px-4 xl:text-sm",
          open || hasActiveChild
            ? "border border-slate-200 bg-slate-50 text-slate-950 shadow-sm"
            : "text-slate-700 hover:bg-slate-50 hover:text-slate-950",
        ].join(" ")}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span>{label}</span>
        <ChevronDown
          size={16}
          className={[
            "transition-transform duration-200 ease-out",
            open ? "translate-y-[1px] rotate-180" : "rotate-0",
          ].join(" ")}
        />
      </button>

      <div
        className={[
          "absolute right-0 top-full z-50 mt-3 w-[22rem] origin-top-right rounded-2xl border border-slate-200 bg-white p-5 shadow-xl ring-1 ring-slate-100/80 backdrop-blur-sm transition-all duration-200 ease-out",
          "max-md:w-[20rem] max-sm:w-[calc(100vw-2rem)]",
          open
            ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
            : "pointer-events-none -translate-y-2 scale-95 opacity-0",
        ].join(" ")}
        role="menu"
      >
        <div className="space-y-4">
          {sections.map((section, index) => (
            <div
              key={section.titleKey}
              className={index === 0 ? "space-y-2" : "space-y-2 border-t border-slate-100 pt-4"}
            >
              <p className="px-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {t(section.titleKey)}
              </p>

              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = pathname === item.to;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={closeAll}
                      className={[
                        "flex min-h-11 items-center justify-between rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ease-out",
                        active
                          ? "bg-slate-900 text-white"
                          : "text-slate-700 hover:bg-slate-100 hover:text-slate-950",
                      ].join(" ")}
                    >
                      <span>{t(item.labelKey)}</span>
                      <ChevronRight
                        size={16}
                        className={active ? "text-white/80" : "text-slate-400"}
                      />
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MobileDropdownMenu({ label, sections, pathname, t }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const hasActiveChild = sections.some((section) =>
    section.items.some((item) => pathname === item.to)
  );

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={[
          "flex min-h-11 w-full items-center justify-between px-4 py-4 text-left text-sm font-semibold transition-all duration-200 ease-out",
          open || hasActiveChild ? "text-slate-950" : "text-slate-700",
        ].join(" ")}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <span>{label}</span>
        <ChevronDown
          size={18}
          className={[
            "transition-transform duration-200 ease-out",
            open ? "rotate-180" : "rotate-0",
          ].join(" ")}
        />
      </button>

      <div
        className={[
          "overflow-hidden transition-all duration-200 ease-out",
          open ? "max-h-[32rem] opacity-100" : "max-h-0 opacity-0",
        ].join(" ")}
      >
        <div className="space-y-4 border-t border-slate-100 px-4 pb-4 pt-3">
          {sections.map((section) => (
            <div key={section.titleKey} className="space-y-2">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-slate-500">
                {t(section.titleKey)}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const active = pathname === item.to;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setOpen(false)}
                      className={[
                        "flex min-h-11 items-center justify-between rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 ease-out",
                        active
                          ? "bg-slate-900 text-white"
                          : "bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-950",
                      ].join(" ")}
                    >
                      <span>{t(item.labelKey)}</span>
                      <ChevronRight
                        size={16}
                        className={active ? "text-white/80" : "text-slate-400"}
                      />
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, user, logout } = useAuth();
  const { t } = useLanguage();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= DESKTOP_BREAKPOINT
  );
  const [navVisible, setNavVisible] = useState(true);

  useEffect(() => {
    const updateViewport = () => {
      setIsDesktop(window.innerWidth >= DESKTOP_BREAKPOINT);
    };

    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let lastY = window.scrollY;

    const handleScroll = () => {
      const currentY = window.scrollY;

      if (mobileOpen) {
        setNavVisible(true);
        lastY = currentY;
        return;
      }

      if (currentY <= 24) {
        setNavVisible(true);
      } else if (currentY > lastY + 8) {
        setNavVisible(false);
      } else if (currentY < lastY - 8) {
        setNavVisible(true);
      }

      lastY = currentY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [mobileOpen]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileOpen) {
      document.body.style.overflow = "";
      return;
    }

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const firstName = useMemo(() => {
    const raw = user?.fullName || user?.name || "";
    return raw.trim().split(/\s+/)[0] || "";
  }, [user]);

  const handleApply = () => {
    navigate("/apply");
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const navLinkClass = ({ isActive }) =>
    [
      "rounded-full px-5 py-2.5 text-sm font-semibold transition-colors",
      isActive ? "text-slate-950" : "text-slate-700 hover:text-slate-950",
    ].join(" ");

  return (
    <header
      className={[
        "sticky top-0 z-50 border-b border-slate-200 bg-white/95 backdrop-blur transition-transform duration-300 ease-out",
        navVisible ? "translate-y-0" : "-translate-y-full",
      ].join(" ")}
    >
      <div className="bg-white">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-8 px-4 py-3 sm:px-6 lg:grid lg:grid-cols-[minmax(220px,300px)_minmax(0,1fr)_auto] lg:gap-4 lg:px-5 lg:py-3.5 xl:grid-cols-[minmax(260px,340px)_minmax(0,1fr)_auto] xl:gap-6 xl:px-6">
          <Link
            to="/"
            className="flex min-w-0 items-center gap-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300"
            aria-label="Alinafe Capital home"
          >
            <div className="shrink-0">
              <img
                src={logoImage}
                alt="Alinafe Capital"
                className="h-[6.5rem] w-auto object-contain sm:h-[6rem] lg:h-[5.7rem] xl:h-[6.4rem]"
              />
            </div>
            <div className="-ml-10 min-w-0 sm:-ml-7 lg:-ml-8">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-800 sm:text-[11px] lg:text-[11px] lg:tracking-[0.16em] xl:text-[13px] xl:tracking-[0.2em]">
                Alinafe Capital
              </p>
              <div className="mt-1.5 h-[2px] w-28 overflow-hidden rounded-full bg-slate-200 sm:w-32 lg:mt-1.5 lg:w-36 xl:mt-2 xl:w-48">
                <div
                  className="h-full w-full animate-[brandDividerShift_3.4s_ease-in-out_infinite]"
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_NAVY} 0%, ${BRAND_GOLD} 48%, ${BRAND_NAVY} 100%)`,
                    backgroundSize: "180% 100%",
                  }}
                />
              </div>
              <p className="mt-1 text-[8px] font-semibold uppercase tracking-[0.16em] text-slate-500 sm:text-[9px] lg:text-[8px] lg:tracking-[0.14em] xl:text-[10px] xl:tracking-[0.18em]">
                Financial Services
              </p>
            </div>
          </Link>

          <nav
            className="hidden min-w-0 w-full max-w-[760px] items-center justify-center justify-self-center rounded-full border border-slate-200 bg-white px-2.5 py-1.5 shadow-sm lg:flex lg:gap-1.5 xl:max-w-[840px] xl:gap-3 xl:px-3.5"
            aria-label="Primary navigation"
          >
            {MAIN_LINKS.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  [
                    "inline-flex min-h-11 items-center rounded-full px-3 py-2.5 text-[13px] font-semibold transition-colors xl:px-4 xl:text-sm",
                    isActive
                      ? "bg-slate-900/95 text-white shadow-sm"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-950",
                  ].join(" ")
                }
                end={item.to === "/"}
              >
                {t(item.labelKey)}
              </NavLink>
            ))}

            <DropdownMenu
              label={t("navbar.more")}
              sections={MORE_SECTIONS}
              pathname={location.pathname}
              t={t}
              isDesktop={isDesktop}
            />
          </nav>

          <div className="hidden min-w-[200px] items-center justify-end gap-2 lg:flex xl:min-w-[220px] xl:gap-2.5">
            {isAuthenticated && firstName ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="text-slate-500">
                  {t("navbar.hi")}, {firstName}
                </span>
              </div>
            ) : null}

            {isAuthenticated ? (
              <>
                <Link
                  to="/dashboard"
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  {t("navbar.dashboard")}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:text-slate-950"
                >
                  {t("navbar.logout")}
                </button>
              </>
            ) : null}

            <button
              type="button"
              onClick={handleApply}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(135deg, ${BRAND_NAVY}, #13427b 70%, ${BRAND_GOLD})`,
              }}
            >
              {t("navbar.applyLoan")}
            </button>
          </div>

          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 text-slate-800 lg:hidden"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes brandDividerShift {
          0% { transform: translateX(-6%); opacity: 0.92; }
          50% { transform: translateX(6%); opacity: 1; }
          100% { transform: translateX(-6%); opacity: 0.92; }
        }
      `}</style>

      {mobileOpen ? (
        <div className="border-t border-slate-200 bg-white/95 backdrop-blur lg:hidden">
          <div className="mx-auto max-h-[calc(100vh-7rem)] max-w-7xl space-y-4 overflow-y-auto px-4 py-5 sm:px-6">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-slate-500">
                  {t("navbar.publicLoanInquiry")}
                </p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {t("navbar.licensed")}
                </p>
              </div>
            </div>

            <div className="grid gap-4">
              {MOBILE_PRIMARY_SECTIONS.map((group) => (
                <MobileSection key={group.titleKey} title={t(group.titleKey)}>
                  {group.links.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.to === "/"}
                      className={({ isActive }) =>
                        [
                          "block rounded-xl px-4 py-3 text-sm font-medium transition-colors",
                          isActive
                            ? "bg-slate-900 text-white"
                            : "bg-slate-50 text-slate-700 hover:bg-slate-100 hover:text-slate-950",
                        ].join(" ")
                      }
                    >
                      {t(item.labelKey)}
                    </NavLink>
                  ))}
                </MobileSection>
              ))}

              <MobileDropdownMenu
                label={t("navbar.more")}
                sections={MORE_SECTIONS}
                pathname={location.pathname}
                t={t}
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/dashboard"
                    className="min-h-11 rounded-2xl border border-slate-200 px-4 py-3 text-center text-sm font-semibold text-slate-700"
                  >
                    {t("navbar.dashboard")}
                  </Link>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="min-h-11 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700"
                  >
                    {t("navbar.logout")}
                  </button>
                </>
              ) : null}

              <button
                type="button"
                onClick={handleApply}
                className="min-h-11 rounded-2xl px-4 py-3 text-sm font-semibold text-white sm:col-span-2"
                style={{
                  background: `linear-gradient(135deg, ${BRAND_NAVY}, #13427b 70%, ${BRAND_GOLD})`,
                }}
              >
                {t("navbar.applyLoan")}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
