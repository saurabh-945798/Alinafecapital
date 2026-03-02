import { Icons } from "./icons";
import { clampNumber } from "./utils";

export function Badge({ label, ariaLabel, collapsed }) {
  return (
    <span
      className={[
        "ml-auto inline-flex items-center justify-center",
        "rounded-full bg-[color:var(--brand-gold)]/20 text-[color:var(--brand-navy)]",
        "text-xs font-semibold",
        collapsed ? "h-6 w-6" : "h-6 min-w-[28px] px-2",
      ].join(" ")}
      aria-label={ariaLabel}
      title={collapsed ? ariaLabel : undefined}
    >
      {label}
    </span>
  );
}

export function StatusBadge({ status }) {
  const s = String(status || "").toLowerCase();
  const tone =
    s.includes("active")
      ? "bg-emerald-50 text-emerald-700 border-emerald-200"
      : s.includes("pending")
      ? "bg-amber-50 text-amber-700 border-amber-200"
      : s.includes("suspend")
      ? "bg-red-50 text-red-700 border-red-200"
      : "bg-gray-50 text-gray-700 border-gray-200";

  return (
    <span
      className={[
        "shrink-0 inline-flex items-center rounded-full border px-2 py-1",
        "text-[11px] font-semibold",
        tone,
      ].join(" ")}
      aria-label={`Status: ${status || "Unknown"}`}
      title={`Status: ${status || "Unknown"}`}
    >
      {status || "Unknown"}
    </span>
  );
}

export function KycChip({ status }) {
  const s = String(status || "").toLowerCase();
  const map = {
    verified: {
      label: "KYC Verified",
      cls: "bg-emerald-50 text-emerald-700 border-emerald-200",
      icon: Icons.CheckCircle,
    },
    pending: {
      label: "KYC Pending",
      cls: "bg-amber-50 text-amber-700 border-amber-200",
      icon: Icons.Clock,
    },
    rejected: {
      label: "KYC Rejected",
      cls: "bg-red-50 text-red-700 border-red-200",
      icon: Icons.XCircle,
    },
    unverified: {
      label: "KYC Not Submitted",
      cls: "bg-gray-50 text-gray-700 border-gray-200",
      icon: Icons.Shield,
    },
  };

  const val = map[s] || map.unverified;
  const Icon = val.icon;

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-1",
        "text-[11px] font-semibold",
        val.cls,
      ].join(" ")}
      aria-label={val.label}
      title={val.label}
    >
      <Icon className="h-3.5 w-3.5" />
      {val.label}
    </span>
  );
}

export function ProgressRing({ value, size = 44, strokeWidth = 6 }) {
  const pct = clampNumber(value, 0, 100);
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;

  return (
    <div className="relative" style={{ width: size, height: size }} aria-label={`Profile ${pct}%`}>
      <svg width={size} height={size} className="block">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(229,231,235,1)"
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="var(--brand-gold)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 220ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="text-xs font-bold text-[color:var(--brand-navy)]">{pct}%</span>
      </div>
    </div>
  );
}

export function SkeletonWidgets() {
  return (
    <div className="flex items-start gap-3">
      <div className="h-11 w-11 rounded-full bg-gray-100 animate-pulse" />
      <div className="flex-1">
        <div className="h-3 w-24 bg-gray-100 rounded animate-pulse" />
        <div className="mt-2 h-4 w-32 bg-gray-100 rounded animate-pulse" />
        <div className="mt-2 h-3 w-44 bg-gray-100 rounded animate-pulse" />
      </div>
    </div>
  );
}

export function SkeletonNav({ collapsed }) {
  const rows = collapsed ? 7 : 9;
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={[
            "rounded-xl bg-gray-100 animate-pulse",
            collapsed ? "h-10 w-10 mx-auto" : "h-10 w-full",
          ].join(" ")}
        />
      ))}
    </div>
  );
}
