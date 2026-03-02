import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../hooks/useProfile";
import { getKycGate } from "../utils/kycGate";

/**
 * Modern + Advanced Dashboard
 * - Framer Motion animations
 * - Glassy gradient header
 * - Card micro-interactions
 * - Consistent CTA placement
 * - Cleaner hierarchy + chips
 * - Better mobile spacing
 */

const container = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { staggerChildren: 0.08, delayChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 10, scale: 0.98 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 240, damping: 22 },
  },
};

function Chip({ tone = "amber", children }) {
  const tones = {
    emerald:
      "bg-emerald-50 text-emerald-700 border border-emerald-200 ring-1 ring-emerald-100",
    amber:
      "bg-amber-50 text-amber-700 border border-amber-200 ring-1 ring-amber-100",
    red: "bg-red-50 text-red-700 border border-red-200 ring-1 ring-red-100",
    slate:
      "bg-slate-50 text-slate-700 border border-slate-200 ring-1 ring-slate-100",
  };

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold",
        tones[tone] || tones.slate,
      ].join(" ")}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {children}
    </span>
  );
}

function CardShell({ children, className = "" }) {
  return (
    <motion.section
      variants={item}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.995 }}
      className={[
        "relative overflow-hidden rounded-2xl border bg-white p-5 shadow-[0_1px_0_rgba(15,23,42,0.04)]",
        "hover:shadow-[0_10px_24px_rgba(15,23,42,0.08)] hover:border-slate-300",
        "transition",
        className,
      ].join(" ")}
    >
      {/* subtle top glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 h-40 w-80 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-200/40 via-sky-200/30 to-emerald-200/30 blur-3xl" />
      <div className="relative flex h-full flex-col">{children}</div>
    </motion.section>
  );
}

function PrimaryButton({ to, children }) {
  return (
    <Link
      to={to}
      className={[
        "inline-flex items-center justify-center rounded-xl px-3 py-2 text-sm font-medium",
        "bg-slate-900 text-white hover:bg-slate-800",
        "focus:outline-none focus:ring-2 focus:ring-slate-300",
        "transition",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

function GhostButton({ to, children }) {
  return (
    <Link
      to={to}
      className={[
        "inline-flex items-center justify-center rounded-xl border px-3 py-2 text-sm font-medium",
        "bg-white hover:bg-slate-50 text-slate-800",
        "focus:outline-none focus:ring-2 focus:ring-slate-200",
        "transition",
      ].join(" ")}
    >
      {children}
    </Link>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  const { profile, loading, error } = useProfile();

  const gate = getKycGate(profile);
  const fullName = profile?.fullName || user?.fullName || "Customer";

  const now = new Date().toLocaleString();

  // chip tone based on status
  const chipToneForKyc = (kycStatus) => {
    if (kycStatus === "verified") return "emerald";
    if (kycStatus === "rejected") return "red";
    if (kycStatus === "pending") return "amber";
    return "slate";
  };

  const chipToneForEligibility = () => {
    if (gate.canApply) return "emerald";
    // if blocked because rejected → red, else amber
    if (gate.kycStatus === "rejected") return "red";
    return "amber";
  };

  const completion = Number.isFinite(Number(gate?.completion))
    ? Math.max(0, Math.min(100, Number(gate.completion)))
    : 0;

  if (loading) {
    return (
      <section className="rounded-2xl border bg-white p-5">
        <p className="text-sm text-gray-600">Loading dashboard...</p>
      </section>
    );
  }

  const showAlert =
    (!gate.canApply && Boolean(gate.blockReason)) || gate.kycStatus === "rejected";

  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* HEADER */}
      <motion.section
        variants={item}
        className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-slate-50 via-white to-sky-50 p-6 text-slate-900 shadow-[0_8px_20px_rgba(15,23,42,0.06)]"
      >
        <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-indigo-300/25 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 -bottom-24 h-64 w-64 rounded-full bg-emerald-300/25 blur-3xl" />

        <div className="relative space-y-1">
          <p className="text-xs text-slate-500">Welcome back</p>
          <h1 className="text-2xl font-semibold leading-tight">
            {fullName}
          </h1>
          <p className="text-sm text-slate-600">
            Track your eligibility, profile and KYC in one place.
          </p>
          <p className="text-[11px] text-slate-500 pt-2">Last updated: {now}</p>
        </div>
      </motion.section>

      {/* ALERT (only when needed) */}
      {showAlert && (
        <motion.section
          variants={item}
          className={[
            "rounded-2xl border p-4",
            gate.kycStatus === "rejected"
              ? "border-red-200 bg-red-50"
              : "border-amber-200 bg-amber-50",
          ].join(" ")}
        >
          <div className="flex items-start gap-3">
            <div
              className={[
                "mt-0.5 h-9 w-9 shrink-0 rounded-xl grid place-items-center border",
                gate.kycStatus === "rejected"
                  ? "border-red-200 bg-white"
                  : "border-amber-200 bg-white",
              ].join(" ")}
            >
              <span
                className={[
                  "text-sm font-bold",
                  gate.kycStatus === "rejected"
                    ? "text-red-700"
                    : "text-amber-700",
                ].join(" ")}
              >
                !
              </span>
            </div>

            <div className="min-w-0">
              <p
                className={[
                  "text-sm font-semibold",
                  gate.kycStatus === "rejected"
                    ? "text-red-800"
                    : "text-amber-800",
                ].join(" ")}
              >
                Action required
              </p>
              <p
                className={[
                  "text-sm mt-0.5",
                  gate.kycStatus === "rejected"
                    ? "text-red-700"
                    : "text-amber-700",
                ].join(" ")}
              >
                {gate.blockReason || "Complete required steps to apply."}
              </p>
            </div>
          </div>
        </motion.section>
      )}

      {error && (
        <motion.section
          variants={item}
          className="rounded-2xl border border-red-200 bg-red-50 p-4"
        >
          <p className="text-sm text-red-700">{error}</p>
        </motion.section>
      )}

      {/* GRID */}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {/* ELIGIBILITY */}
        <CardShell className="min-h-[200px]">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">
                Eligibility
              </h2>
              <p className="text-xs text-slate-500">
                Check if you can apply today.
              </p>
            </div>

            <Chip tone={chipToneForEligibility()}>
              {gate.canApply ? "Eligible" : "Blocked"}
            </Chip>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-sm text-slate-700">
              {gate.canApply ? "You can apply now." : "Complete required steps first."}
            </p>
            <p className="text-xs text-slate-500">
              {gate.canApply
                ? "Start your loan application when you are ready."
                : "Finish profile and submit valid KYC documents to unlock apply."}
            </p>
          </div>

          <div className="mt-auto pt-4 flex justify-end">
            <GhostButton to="/dashboard/eligibility">View details</GhostButton>
          </div>
        </CardShell>

        {/* PROFILE COMPLETION */}
        <CardShell className="min-h-[200px]">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">
                Profile Completion
              </h2>
              <p className="text-xs text-slate-500">
                Complete your profile for faster review.
              </p>
            </div>
            <Chip tone={completion >= 90 ? "emerald" : completion >= 50 ? "amber" : "slate"}>
              {completion}%
            </Chip>
          </div>

          <div className="mt-4 space-y-3">
            <div className="w-full">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Progress</span>
                <span>{completion}%</span>
              </div>

              <div className="mt-2 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${completion}%` }}
                  transition={{ type: "spring", stiffness: 160, damping: 26 }}
                  className="h-full rounded-full bg-emerald-500"
                />
              </div>
            </div>

            <p className="text-sm text-slate-700">
              {completion >= 90
                ? "Your profile looks good."
                : "Add missing details to improve approval speed."}
            </p>
            <p className="text-xs text-slate-500">
              Tip: Fill your ID details and employment info.
            </p>
          </div>

          <div className="mt-auto pt-4 flex justify-end">
            <PrimaryButton to="/dashboard/profile-completion">
              Complete now
            </PrimaryButton>
          </div>
        </CardShell>

        {/* KYC STATUS */}
        <CardShell className="min-h-[200px]">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">KYC Status</h2>
              <p className="text-xs text-slate-500">
                Identity verification for your account.
              </p>
            </div>

            <Chip tone={chipToneForKyc(gate.kycStatus)}>
              {gate.kycStatus?.replaceAll("_", " ") || "Not started"}
            </Chip>
          </div>

          <div className="mt-4 space-y-2">
            <p className="text-sm text-slate-700">
              {gate.kycStatus === "verified"
                ? "Your KYC is verified."
                : gate.kycStatus === "pending"
                ? "KYC is under review."
                : gate.kycStatus === "rejected"
                ? "KYC was rejected. Please upload clearer documents."
                : "Submit KYC to continue."}
            </p>
            <p className="text-xs text-slate-500">
              Upload valid documents for verification.
            </p>
          </div>

          <div className="mt-auto pt-4 flex justify-end">
            <GhostButton to="/dashboard/kyc-status">View KYC</GhostButton>
          </div>
        </CardShell>

        {/* WELCOME / QUICK START */}
        <CardShell className="min-h-[200px]">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h2 className="text-lg font-semibold text-slate-900">Welcome</h2>
              <p className="text-xs text-slate-500">
                Quick actions to get started.
              </p>
            </div>
            <Chip tone="slate">Account</Chip>
          </div>

          <div className="mt-4 space-y-3">
            <p className="text-sm text-slate-700">
              Hello {fullName}. Manage your loan account here.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/dashboard/profile-completion"
                className="rounded-xl border bg-white px-3 py-2 text-sm hover:bg-slate-50 transition"
              >
                Update profile
              </Link>
              <Link
                to="/dashboard/kyc-status"
                className="rounded-xl border bg-white px-3 py-2 text-sm hover:bg-slate-50 transition"
              >
                Submit KYC
              </Link>
            </div>

            <p className="text-xs text-slate-500">
              Keep details correct for smooth repayment.
            </p>
          </div>

          <div className="mt-auto pt-4 flex justify-end">
            <GhostButton to="/dashboard/profile-completion">View profile</GhostButton>
          </div>
        </CardShell>
      </div>
    </motion.div>
  );
}
