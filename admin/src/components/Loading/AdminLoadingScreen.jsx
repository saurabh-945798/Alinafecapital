import alinafeLogo from "../../assets/alinafe-logo.png";
import restockLogo from "../../assets/restock-tech-logo.png";

export default function AdminLoadingScreen({
  message = "Preparing admin workspace...",
  subtext = "Please wait while the system completes this action.",
  mode = "full",
}) {
  const isCompact = mode === "compact";

  if (isCompact) {
    return (
      <div className="pointer-events-none fixed inset-x-0 top-0 z-[9998] flex justify-center px-4 py-3">
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/95 px-4 py-2 shadow-lg shadow-slate-900/10 backdrop-blur-xl">
          <span className="relative flex h-7 w-7 items-center justify-center rounded-full bg-slate-950">
            <span className="absolute h-7 w-7 animate-ping rounded-full bg-slate-950/20" />
            <span className="h-2.5 w-2.5 rounded-full bg-white" />
          </span>
          <span className="text-xs font-semibold text-slate-700">{message}</span>
          <span className="hidden h-5 w-px bg-slate-200 sm:block" />
          <span className="hidden items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400 sm:flex">
            Powered by
            <img src={restockLogo} alt="Restock Tech" className="h-6 w-auto object-contain" />
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/85 px-4 backdrop-blur-md">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white/10 bg-white shadow-2xl shadow-slate-950/40">
        <div className="bg-[radial-gradient(circle_at_top_left,#0b3768_0%,#07152d_45%,#020817_100%)] px-7 py-8 text-white">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white shadow-sm">
                <img src={alinafeLogo} alt="Alinafe Capital" className="h-10 w-auto object-contain" />
              </div>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/60">Alinafe Capital</p>
                <p className="mt-1 text-lg font-black">Admin Console</p>
              </div>
            </div>
            <div className="h-11 w-11 rounded-full border border-white/15 border-t-white/80 animate-spin" />
          </div>

          <div className="mt-8">
            <p className="text-2xl font-black leading-tight">{message}</p>
            <p className="mt-3 text-sm leading-6 text-white/70">{subtext}</p>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 bg-white px-7 py-4">
          <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-slate-400">Powered by</span>
          <img src={restockLogo} alt="Restock Tech" className="h-9 w-auto object-contain" />
        </div>
      </div>
    </div>
  );
}
