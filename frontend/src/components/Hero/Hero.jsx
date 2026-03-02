import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";

/* =========================================================
   CONFIG
========================================================= */

const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";
const AUTOPLAY_INTERVAL = 5000;

/* =========================================================
   SLIDE DATA
========================================================= */

const slides = [
  {
    id: 1,
    image:
      "https://images.unsplash.com/photo-1581578731548-c64695cc6952?q=80&w=1920&auto=format&fit=crop",
    headline: "Apply for a Loan in 5 Minutes",
    highlight: "Fast Approval in MWK",
    description:
      "Access transparent microfinance solutions designed for individuals and small businesses across Malawi.",
    primaryCTA: { label: "Apply Now", href: "/apply" },
    secondaryCTA: { label: "Check Eligibility", href: "/eligibility" },
  },
  {
    id: 2,
    image:
      "https://images.unsplash.com/photo-1601597111158-2fceff292cdc?q=80&w=1920&auto=format&fit=crop",
    headline: "Serving Communities Across Malawi",
    highlight: "Find Your Nearest Branch",
    description:
      "Visit our trusted local branches or connect via phone and WhatsApp for quick assistance.",
    primaryCTA: { label: "Find a Branch", href: "/branches" },
    secondaryCTA: { label: "Contact Us", href: "/contact" },
  },
  {
    id: 3,
    image:
      "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?q=80&w=1920&auto=format&fit=crop",
    headline: "Know Your Repayment Before You Apply",
    highlight: "No Hidden Charges",
    description:
      "Use our transparent repayment calculator and understand exactly what you’ll pay in MWK.",
    primaryCTA: { label: "Use Calculator", href: "/calculator" },
    secondaryCTA: { label: "View Interest Rates", href: "/interest-rates" },
  },
];

/* =========================================================
   COMPONENT
========================================================= */

const Hero = () => {
  const [current, setCurrent] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const prefersReducedMotion = useReducedMotion();
  const touchStartX = useRef(null);
  const intervalRef = useRef(null);

  const nextSlide = () =>
    setCurrent((prev) => (prev + 1) % slides.length);

  const prevSlide = () =>
    setCurrent((prev) =>
      prev === 0 ? slides.length - 1 : prev - 1
    );

  /* =========================
     AUTOPLAY
  ========================= */

  useEffect(() => {
    if (prefersReducedMotion) return;
    if (isHovered) return;

    intervalRef.current = setInterval(
      nextSlide,
      AUTOPLAY_INTERVAL
    );

    return () => clearInterval(intervalRef.current);
  }, [isHovered, prefersReducedMotion]);

  /* =========================
     Pause when tab hidden
  ========================= */

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden) {
        clearInterval(intervalRef.current);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener(
        "visibilitychange",
        handleVisibility
      );
  }, []);

  /* =========================
     Keyboard Support
  ========================= */

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "ArrowRight") nextSlide();
      if (e.key === "ArrowLeft") prevSlide();
    };
    window.addEventListener("keydown", handleKey);
    return () =>
      window.removeEventListener("keydown", handleKey);
  }, []);

  /* =========================
     Swipe Support
  ========================= */

  const handleTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e) => {
    if (!touchStartX.current) return;
    const diff =
      e.changedTouches[0].clientX - touchStartX.current;

    if (diff > 50) prevSlide();
    if (diff < -50) nextSlide();

    touchStartX.current = null;
  };

  const slide = slides[current];

  return (
    <section
      className="relative w-full min-h-screen overflow-hidden flex items-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      aria-label="Alinafe Capital Hero"
    >
      {/* ================= Background Image ================= */}
      <AnimatePresence mode="wait">
        <motion.img
          key={slide.id}
          src={slide.image}
          alt="Microfinance in Malawi"
          loading={current === 0 ? "eager" : "lazy"}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-0 w-full h-full object-cover"
        />
      </AnimatePresence>

      {/* Overlay */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/60 to-black/30" />

      {/* ================= Content ================= */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-32 w-full">
        <div className="max-w-2xl text-white">

          <h1 className="text-3xl sm:text-5xl font-bold leading-tight">
            {slide.headline} <br />
            <span style={{ color: BRAND_GOLD }}>
              {slide.highlight}
            </span>
          </h1>

          <p className="mt-6 text-lg text-white/90">
            {slide.description}
          </p>

          {/* CTA Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row gap-4">
            <a
              href={slide.primaryCTA.href}
              className="px-6 py-3 rounded-lg text-white font-semibold transition focus-visible:ring-2"
              style={{ backgroundColor: BRAND_NAVY }}
            >
              {slide.primaryCTA.label}
            </a>

            <a
              href={slide.secondaryCTA.href}
              className="px-6 py-3 rounded-lg font-semibold transition border"
              style={{
                borderColor: BRAND_GOLD,
                color: BRAND_GOLD,
              }}
            >
              {slide.secondaryCTA.label}
            </a>
          </div>

          {/* Trust Chips */}
          <div className="mt-8 flex flex-wrap gap-3 text-sm">
            <span className="bg-white/20 px-3 py-1 rounded-full">
              Licensed Institution
            </span>
            <span className="bg-white/20 px-3 py-1 rounded-full">
              Transparent Fees
            </span>
            <span className="bg-white/20 px-3 py-1 rounded-full">
              Fast Approval
            </span>
          </div>

          {/* Proof Block */}
          <div className="mt-8 flex gap-8 text-sm text-white/80">
            <div>
              <p className="font-bold text-white">10+ Years</p>
              <p>Serving Malawi</p>
            </div>
            <div>
              <p className="font-bold text-white">15+ Branches</p>
              <p>Nationwide</p>
            </div>
            <div>
              <p className="font-bold text-white">20,000+</p>
              <p>Clients Served</p>
            </div>
          </div>
        </div>
      </div>

      {/* ================= Controls ================= */}
      <button
        onClick={prevSlide}
        aria-label="Previous Slide"
        className="absolute left-5 top-1/2 -translate-y-1/2 bg-black/40 text-white p-3 rounded-full"
      >
        ‹
      </button>

      <button
        onClick={nextSlide}
        aria-label="Next Slide"
        className="absolute right-5 top-1/2 -translate-y-1/2 bg-black/40 text-white p-3 rounded-full"
      >
        ›
      </button>

      {/* Dots */}
      <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3">
        {slides.map((_, i) => (
          <button
            key={i}
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setCurrent(i)}
            className={`w-3 h-3 rounded-full ${
              current === i
                ? "bg-white"
                : "bg-white/40"
            }`}
          />
        ))}
      </div>
    </section>
  );
};

export default Hero;
