import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";
const AUTOPLAY_INTERVAL = 1800;

const slides = [
  {
    id: 1,
    image:
      "https://images.unsplash.com/photo-1644043350898-2f4ff1e17912?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    badge: "Simple Lending",
    headline: "Easy loans built for real needs",
    highlight: "Fast, secure, and transparent",
    description:
      "Start your loan request with a cleaner process, practical terms, and support designed for households and businesses across Malawi.",
    primaryCTA: { label: "Apply Now", href: "/apply" },
    secondaryCTA: { label: "Check Eligibility", href: "/eligibility" },
  },
  {
    id: 2,
    image: "https://plus.unsplash.com/premium_photo-1661720538742-59e4e852aacd?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    badge: "Quick Review",
    headline: "Move from inquiry to review without delay",
    highlight: "A faster customer journey",
    description:
      "Submit your request, complete your details, and stay clear on the next step from the first message to final decision.",
    primaryCTA: { label: "Start Inquiry", href: "/apply" },
    secondaryCTA: { label: "How It Works", href: "/how-it-works" },
  },
  {
    id: 3,
    image: "https://images.unsplash.com/photo-1739285452644-3a2c009112fe?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
    badge: "Transparent Fees",
    headline: "Know your repayment position before you commit",
    highlight: "No hidden surprises",
    description:
      "Review rates, calculate monthly repayment, and understand the numbers clearly before you submit your application.",
    primaryCTA: { label: "Use Calculator", href: "/calculator" },
    secondaryCTA: { label: "View Rates", href: "/interest-rates" },
  },
  {
    id: 4,
    image: "https://www.urban.org/sites/default/files/2024-02/GettyImages-1346691472_crop.jpg",
    badge: "Local Support",
    headline: "Get support across branches and follow-up channels",
    highlight: "Closer to customers in Malawi",
    description:
      "Reach out through branches, guided support, and practical follow-up designed to keep the process simple and responsive.",
    primaryCTA: { label: "Find a Branch", href: "/branches" },
    secondaryCTA: { label: "Customer Support", href: "/complaints" },
  },
];

const trustPoints = [
  "Licensed institution",
  "Transparent fees",
  "Faster review",
];

const stats = [
  { value: "6+", label: "Years serving Malawi" },
  { value: "1+", label: "Branches nationwide" },
];

const Hero = () => {
  const [current, setCurrent] = useState(0);
  const [isPageVisible, setIsPageVisible] = useState(
    typeof document === "undefined" ? true : !document.hidden
  );
  const prefersReducedMotion = useReducedMotion();
  const touchStartX = useRef(null);
  const timeoutRef = useRef(null);

  const nextSlide = () => setCurrent((prev) => (prev + 1) % slides.length);
  const prevSlide = () => setCurrent((prev) => (prev === 0 ? slides.length - 1 : prev - 1));

  useEffect(() => {
    if (prefersReducedMotion || !isPageVisible) return undefined;

    timeoutRef.current = window.setTimeout(nextSlide, AUTOPLAY_INTERVAL);

    return () => {
      window.clearTimeout(timeoutRef.current);
    };
  }, [current, isPageVisible, prefersReducedMotion]);

  useEffect(() => {
    const handleVisibility = () => {
      setIsPageVisible(!document.hidden);
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    const handleKey = (event) => {
      if (event.key === "ArrowRight") nextSlide();
      if (event.key === "ArrowLeft") prevSlide();
    };

    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0].clientX;
  };

  const handleTouchEnd = (event) => {
    if (!touchStartX.current) return;

    const diff = event.changedTouches[0].clientX - touchStartX.current;
    if (diff > 50) prevSlide();
    if (diff < -50) nextSlide();
    touchStartX.current = null;
  };

  const slide = slides[current];

  return (
    <section
      className="relative overflow-hidden py-2"
      style={{
        background:
          "linear-gradient(135deg, rgba(0,45,91,0.06) 0%, rgba(0,45,91,0.03) 40%, rgba(255,255,255,1) 100%)",
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="Alinafe Capital Hero"
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(179,142,70,0.12),_transparent_36%),radial-gradient(circle_at_top_right,_rgba(0,45,91,0.08),_transparent_44%)]" />

      <div className="relative mx-auto max-w-[1440px] px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="grid items-center gap-8 lg:grid-cols-[minmax(0,1.02fr)_minmax(540px,0.98fr)] lg:gap-10 xl:gap-14">
          <div className="order-2 flex flex-col justify-center lg:order-1 lg:pr-4">
            <span className="inline-flex w-fit rounded-full border border-[#d7c29a] bg-[#fff8ec] px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.28em] text-[#8e6f2e]">
              {slide.badge}
            </span>

            <AnimatePresence mode="wait">
              <motion.div
                key={slide.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.35, ease: "easeOut" }}
              >
                <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.08] text-slate-950 sm:text-5xl xl:text-[3.7rem]">
                  {slide.headline}
                  <span className="mt-2 block" style={{ color: BRAND_GOLD }}>
                    {slide.highlight}
                  </span>
                </h1>

                <p className="mt-6 max-w-xl text-base leading-8 text-slate-600 sm:text-lg">
                  {slide.description}
                </p>
              </motion.div>
            </AnimatePresence>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <a
                href={slide.primaryCTA.href}
                className="inline-flex min-h-12 items-center justify-center rounded-xl px-6 py-3 text-center text-sm font-semibold text-white shadow-[0_18px_35px_rgba(0,45,91,0.22)] transition hover:-translate-y-0.5"
                style={{ backgroundColor: BRAND_NAVY }}
              >
                {slide.primaryCTA.label}
              </a>
              <a
                href={slide.secondaryCTA.href}
                className="inline-flex min-h-12 items-center justify-center rounded-xl border px-6 py-3 text-center text-sm font-semibold transition hover:bg-slate-50"
                style={{ borderColor: "#d7c29a", color: BRAND_GOLD }}
              >
                {slide.secondaryCTA.label}
              </a>
            </div>

            <div className="mt-8 flex flex-wrap gap-3 text-sm text-slate-600">
              {trustPoints.map((point) => (
                <span key={point} className="rounded-full border border-slate-200 bg-white px-3.5 py-2 shadow-sm">
                  {point}
                </span>
              ))}
            </div>

            <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {stats.map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                  <p className="text-xl font-bold text-slate-950">{stat.value}</p>
                  <p className="mt-1 text-sm text-slate-600">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="order-1 lg:order-2">
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-white p-3 shadow-[0_32px_80px_rgba(15,23,42,0.12)] sm:p-4">
              <div className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-b-[2rem] bg-[radial-gradient(circle_at_top,_rgba(179,142,70,0.18),_transparent_72%)]" />

              <div className="relative overflow-hidden rounded-[1.6rem] bg-[linear-gradient(180deg,#fdfbf7_0%,#f7f4ee_100%)]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={slide.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                    className="flex min-h-[260px] items-center justify-center p-4 sm:min-h-[340px] sm:p-6 lg:min-h-[430px] xl:min-h-[500px]"
                  >
                    <img
                      src={slide.image}
                      alt={slide.headline}
                      loading={current === 0 ? "eager" : "lazy"}
                      className="h-full w-full object-contain"
                    />
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-4 flex items-center justify-center">
                <div className="flex items-center gap-2">
                  {slides.map((item, index) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-label={`Go to slide ${index + 1}`}
                      onClick={() => setCurrent(index)}
                      className={`rounded-full transition-all duration-200 ${current === index ? "h-2.5 w-8 bg-slate-900" : "h-2.5 w-2.5 bg-slate-300 hover:bg-slate-400"}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
