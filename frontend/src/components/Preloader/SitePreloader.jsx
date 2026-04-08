import { useEffect } from "react";
import AlinafeLogo from "../Navbar/AlinafeLogo.jsx";

const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";

export default function SitePreloader({ visible = true }) {
  useEffect(() => {
    if (typeof document === "undefined") return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = visible ? "hidden" : previousOverflow || "";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [visible]);

  return (
    <>
      <div
        className={[
          "fixed inset-0 z-[100] overflow-hidden bg-white transition-all duration-500 ease-out",
          visible ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
        aria-hidden={!visible}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(179,142,70,0.12),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(0,45,91,0.08),_transparent_42%)]" />
        <div className="absolute left-1/2 top-[18%] h-64 w-64 -translate-x-1/2 rounded-full bg-amber-100/40 blur-3xl animate-[preloaderGlow_3.6s_ease-in-out_infinite]" />
        <div className="absolute left-[12%] top-[22%] h-32 w-32 rounded-full border border-slate-200/70 bg-white/70 blur-[1px]" />
        <div className="absolute bottom-[12%] right-[10%] h-40 w-40 rounded-full border border-amber-100 bg-white/80 blur-[1px]" />

        <div className="relative flex min-h-screen w-full items-center justify-center px-6 py-12">
          <div className="flex w-full max-w-2xl flex-col items-center text-center">
            <div className="rounded-[2rem] border border-slate-200/80 bg-white/90 px-8 py-10 shadow-[0_25px_80px_rgba(15,23,42,0.08)] backdrop-blur-sm sm:px-12">
              <div className="mx-auto w-full max-w-[14rem] animate-[preloaderFloat_2.2s_ease-in-out_infinite] sm:max-w-[16rem]">
                <AlinafeLogo className="h-auto w-full" showTagline={false} />
              </div>

              <div className="mt-6 flex items-center justify-center gap-3">
                <span className="h-2.5 w-2.5 rounded-full bg-slate-300 animate-[preloaderDot_1.2s_ease-in-out_infinite]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#B38E46] animate-[preloaderDot_1.2s_ease-in-out_0.18s_infinite]" />
                <span className="h-2.5 w-2.5 rounded-full bg-[#002D5B] animate-[preloaderDot_1.2s_ease-in-out_0.36s_infinite]" />
              </div>

              <div className="mt-6 h-[4px] w-full max-w-[20rem] overflow-hidden rounded-full bg-slate-200/80">
                <div
                  className="h-full w-full animate-[preloaderSweep_1.8s_linear_infinite]"
                  style={{
                    background: `linear-gradient(90deg, ${BRAND_NAVY} 0%, ${BRAND_GOLD} 38%, #e9dcc0 52%, ${BRAND_GOLD} 66%, ${BRAND_NAVY} 100%)`,
                    backgroundSize: "200% 100%",
                  }}
                />
              </div>

              <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.42em] text-slate-500">
                Alinafe Capital
              </p>
              <p className="mt-2 text-sm font-medium text-slate-600 sm:text-[15px]">
                Preparing your secure lending experience
              </p>

              <div className="mt-5 inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-[11px] font-medium uppercase tracking-[0.22em] text-slate-500">
                Financial Services
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes preloaderFloat {
          0% { transform: translateY(0px); opacity: 0.98; }
          50% { transform: translateY(-10px); opacity: 1; }
          100% { transform: translateY(0px); opacity: 0.98; }
        }

        @keyframes preloaderSweep {
          0% { background-position: 180% 50%; }
          100% { background-position: -80% 50%; }
        }

        @keyframes preloaderGlow {
          0% { transform: translateX(-50%) scale(0.92); opacity: 0.5; }
          50% { transform: translateX(-50%) scale(1.06); opacity: 0.9; }
          100% { transform: translateX(-50%) scale(0.92); opacity: 0.5; }
        }

        @keyframes preloaderDot {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-5px); opacity: 1; }
        }
      `}</style>
    </>
  );
}
