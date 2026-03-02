import React, { useEffect, useMemo, useRef, useState } from "react";
import { buildSidebarGroups } from "./sidebar/config";
import { Icons } from "./sidebar/icons";
import { Badge, KycChip, ProgressRing, SkeletonNav, SkeletonWidgets, StatusBadge } from "./sidebar/ui";
import { clampNumber, formatDateLoose, getInitials } from "./sidebar/utils";

/**
 * DashboardSidebar
 * - Brand header (logo + name + role/status badge)
 * - Collapsible (desktop) + icon-only mode
 * - Mobile slide-over drawer with overlay + ESC to close
 * - Active nav styling (left bar + bg + icon color)
 * - Grouped navigation
 * - Unread counters (tasks/updates/unpaid)
 * - Progress widgets (profile ring + KYC chip + next action)
 * - Smart CTA zone (dynamic primary action)
 * - Sticky footer actions (Help, Contact, Logout)
 * - Accessibility (focus-visible, aria, keyboard nav)
 * - Theming via CSS variables
 * - Route/section-driven config array
 * - Trust/compliance card
 * - Skeleton state while loading
 */

export default function DashboardSidebar({
  userName,
  userEmail = "",
  userRole = "Customer",
  userStatus = "Active", // e.g. Active / Suspended / Pending
  onGoToSection,
  onLogout,

  // route/active control
  activeSection = "overview", // string key matching config items
  // optional: if you prefer route paths, you can pass activeSection accordingly

  // loading state
  isLoading = false,

  // brand
  brandName = "Alinafe Capital",
  logoSrc = "", // optional image url
  logoAlt = "Brand logo",

  // progress widgets
  profilePercent = 0, // 0..100
  kycStatus = "unverified", // unverified | pending | verified | rejected
  nextRequiredAction = "Complete your profile",

  // counters
  counters = {
    pendingTasks: 0,
    newUpdates: 0,
    unpaidInstallments: 0,
  },

  // trust panel
  verifiedAt = "", // e.g. "2026-02-10"
  supportPhone = "+265 999 000 000",
  policyLinks = [
    { label: "Privacy", href: "/privacy" },
    { label: "Terms", href: "/terms" },
    { label: "Fees", href: "/fees" },
  ],

  // CTA handlers
  onPrimaryAction, // optional; otherwise we call onGoToSection based on computed CTA
  // mobile control (optional external trigger)
  defaultMobileOpen = false,

  // theming
  theme = {
    navy: "#0B1B3A",
    gold: "#D4AF37",
    neutral: "#111827",
    surface: "#FFFFFF",
    border: "#E5E7EB",
  },
}) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(!!defaultMobileOpen);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Keyboard nav (roving)
  const itemRefs = useRef([]);
  const [focusedIndex, setFocusedIndex] = useState(-1);

  const groups = useMemo(() => buildSidebarGroups(counters), [counters]);

  const flatItems = useMemo(() => {
    const out = [];
    for (const g of groups) for (const it of g.items) out.push({ ...it, group: g.group });
    return out;
  }, [groups]);

  const primaryCTA = useMemo(() => {
    const pct = clampNumber(profilePercent, 0, 100);

    if (kycStatus === "rejected") {
      return {
        label: "Fix KYC",
        intent: "danger",
        actionKey: "kyc-status",
      };
    }
    if (kycStatus === "unverified") {
      if (pct < 80) {
        return {
          label: "Complete Profile",
          intent: "primary",
          actionKey: "profile-completion",
        };
      }
      return {
        label: "Submit KYC",
        intent: "primary",
        actionKey: "kyc-status",
      };
    }
    if (kycStatus === "pending") {
      return {
        label: "Check KYC Status",
        intent: "neutral",
        actionKey: "kyc-status",
      };
    }
    // verified
    return {
      label: "Apply Loan",
      intent: "primary",
      actionKey: "apply-loan",
    };
  }, [kycStatus, profilePercent]);

  // Close mobile on large screens (responsive rules)
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = () => {
      if (mq.matches) setMobileOpen(false);
    };
    onChange();
    mq.addEventListener?.("change", onChange);
    return () => mq.removeEventListener?.("change", onChange);
  }, []);

  // ESC to close drawer
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape" && mobileOpen) setMobileOpen(false);
      if (e.key === "Escape" && showLogoutConfirm) setShowLogoutConfirm(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileOpen, showLogoutConfirm]);

  const handleGo = (key) => {
    if (typeof onGoToSection === "function") onGoToSection(key);
    setMobileOpen(false);
  };

  const handlePrimary = () => {
    if (typeof onPrimaryAction === "function") {
      onPrimaryAction(primaryCTA);
      setMobileOpen(false);
      return;
    }
    handleGo(primaryCTA.actionKey);
  };

  const openLogoutConfirm = () => {
    setShowLogoutConfirm(true);
    setMobileOpen(false);
  };

  const confirmLogout = () => {
    setShowLogoutConfirm(false);
    if (typeof onLogout === "function") onLogout();
  };

  // Keyboard navigation inside menu list (Up/Down/Home/End/Enter/Space)
  const onNavKeyDown = (e) => {
    const total = flatItems.length;
    if (!total) return;

    const moveFocus = (next) => {
      const idx = clampNumber(next, 0, total - 1);
      setFocusedIndex(idx);
      const el = itemRefs.current[idx];
      el?.focus?.();
    };

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        moveFocus((focusedIndex < 0 ? 0 : focusedIndex + 1) % total);
        break;
      case "ArrowUp":
        e.preventDefault();
        moveFocus((focusedIndex < 0 ? total - 1 : (focusedIndex - 1 + total) % total));
        break;
      case "Home":
        e.preventDefault();
        moveFocus(0);
        break;
      case "End":
        e.preventDefault();
        moveFocus(total - 1);
        break;
      case "Enter":
      case " ":
        if (focusedIndex >= 0) {
          e.preventDefault();
          const it = flatItems[focusedIndex];
          if (it?.onClickKey) handleGo(it.onClickKey);
        }
        break;
      default:
        break;
    }
  };

  const themeStyle = {
    "--brand-navy": theme.navy,
    "--brand-gold": theme.gold,
    "--brand-neutral": theme.neutral,
    "--brand-surface": theme.surface,
    "--brand-border": theme.border,
  };

  const Shell = ({ children }) => (
    <div style={themeStyle} className="text-[color:var(--brand-neutral)]">
      {children}
    </div>
  );

  // Shared sidebar content
  const SidebarContent = ({ inDrawer = false }) => (
    <aside
      aria-label="Dashboard navigation"
      className={[
        "rounded-2xl border bg-[color:var(--brand-surface)]",
        "border-[color:var(--brand-border)]",
        "shadow-sm",
        inDrawer ? "h-full" : "h-fit lg:sticky lg:top-6",
        collapsed && !inDrawer ? "w-[88px]" : "w-full",
        "transition-[width] duration-200 ease-out",
      ].join(" ")}
    >
      {/* Brand Header Block */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div
            className={[
              "shrink-0 rounded-xl border",
              "border-[color:var(--brand-border)]",
              "bg-white",
              "grid place-items-center",
              collapsed && !inDrawer ? "h-10 w-10" : "h-11 w-11",
              "overflow-hidden",
            ].join(" ")}
            aria-label="Brand"
          >
            {logoSrc ? (
              <img src={logoSrc} alt={logoAlt} className="h-full w-full object-cover" />
            ) : (
              <div
                className="h-full w-full grid place-items-center"
                title={brandName}
                aria-hidden="true"
              >
                <span className="text-sm font-bold text-[color:var(--brand-navy)]">
                  {getInitials(brandName)}
                </span>
              </div>
            )}
          </div>

          {(!collapsed || inDrawer) && (
            <div className="min-w-0 flex-1">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-semibold leading-tight truncate">
                  {userName || "Welcome"}
                </p>
                <p className="text-xs text-gray-500 leading-tight truncate">
                  {userEmail || userRole}
                </p>
                {userEmail ? (
                  <p className="text-[11px] text-gray-400 leading-tight truncate">
                    {userRole}
                  </p>
                ) : null}
                <div className="pt-1">
                  <StatusBadge status={userStatus} />
                </div>
              </div>
            </div>
          )}

          {/* Desktop collapse toggle */}
          {!inDrawer && (
            <button
              type="button"
              onClick={() => setCollapsed((v) => !v)}
              className={[
                "ml-auto mt-1 rounded-lg border px-2 py-2",
                "border-[color:var(--brand-border)]",
                "hover:bg-gray-50 active:bg-gray-100",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-gold)]",
                "hidden lg:inline-flex",
              ].join(" ")}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand" : "Collapse"}
            >
              <Icons.ChevronLeft
                className={[
                  "h-4 w-4 transition-transform",
                  collapsed ? "rotate-180" : "rotate-0",
                  "text-[color:var(--brand-navy)]",
                ].join(" ")}
              />
            </button>
          )}
        </div>

        {/* Quick progress widgets */}
        <div
          className={[
            "mt-4 rounded-2xl border p-3",
            "border-[color:var(--brand-border)]",
            "bg-white",
            collapsed && !inDrawer ? "hidden" : "block",
          ].join(" ")}
        >
          {isLoading ? (
            <SkeletonWidgets />
          ) : (
            <div className="flex items-start gap-3">
              <ProgressRing value={clampNumber(profilePercent, 0, 100)} size={44} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold">Profile</p>
                  <span className="text-xs text-gray-500">{clampNumber(profilePercent, 0, 100)}%</span>
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <KycChip status={kycStatus} />
                </div>
                <p className="mt-2 text-xs text-gray-600 truncate">
                  <span className="font-medium">Next:</span> {nextRequiredAction || "—"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Smart CTA zone */}
        <div className={["mt-3", collapsed && !inDrawer ? "hidden" : "block"].join(" ")}>
          {isLoading ? (
            <div className="h-10 rounded-xl bg-gray-100 animate-pulse" />
          ) : (
            <button
              type="button"
              onClick={handlePrimary}
              className={[
                "w-full rounded-xl px-3 py-2.5 text-sm font-semibold",
                "transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-gold)]",
                primaryCTA.intent === "danger"
                  ? "bg-red-600 text-white hover:bg-red-700 active:bg-red-800"
                  : primaryCTA.intent === "neutral"
                  ? "bg-gray-900 text-white hover:bg-black active:bg-black/90"
                  : "bg-[color:var(--brand-navy)] text-white hover:opacity-95 active:opacity-90",
              ].join(" ")}
              aria-label={primaryCTA.label}
            >
              {primaryCTA.label}
            </button>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="px-2 pb-2"
        aria-label="Sidebar sections"
        onKeyDown={onNavKeyDown}
      >
        {isLoading ? (
          <div className="px-2 py-2">
            <SkeletonNav collapsed={collapsed && !inDrawer} />
          </div>
        ) : (
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g.group}>
                {(!collapsed || inDrawer) && (
                  <p className="px-3 text-[11px] font-semibold tracking-wide text-gray-500 uppercase">
                    {g.group}
                  </p>
                )}

                <div className="mt-1 space-y-1">
                  {g.items.map((it) => {
                    const active = it.id === activeSection;
                    const Icon = it.icon;
                    const showText = !collapsed || inDrawer;

                    // store refs in flat order
                    const flatIndex = flatItems.findIndex((x) => x.id === it.id);

                    return (
                      <button
                        key={it.id}
                        ref={(el) => {
                          if (flatIndex >= 0) itemRefs.current[flatIndex] = el;
                        }}
                        type="button"
                        onClick={() => handleGo(it.onClickKey)}
                        className={[
                          "group relative w-full rounded-xl px-3 py-2.5",
                          "flex items-center gap-3",
                          "text-left text-sm",
                          "transition-all duration-200",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-gold)]",
                          active
                            ? "bg-[color:var(--brand-navy)]/5"
                            : "hover:bg-gray-50 active:bg-gray-100",
                        ].join(" ")}
                        aria-current={active ? "page" : undefined}
                        aria-label={it.label}
                        title={showText ? undefined : it.label}
                      >
                        {/* Active left bar indicator */}
                        <span
                          aria-hidden="true"
                          className={[
                            "absolute left-0 top-2 bottom-2 w-1 rounded-r-full",
                            active ? "bg-[color:var(--brand-gold)]" : "bg-transparent",
                            "transition-colors duration-200",
                          ].join(" ")}
                        />

                        <Icon
                          className={[
                            "h-5 w-5 shrink-0 transition-colors duration-200",
                            active
                              ? "text-[color:var(--brand-navy)]"
                              : "text-gray-500 group-hover:text-[color:var(--brand-navy)]",
                          ].join(" ")}
                        />

                        {showText && (
                          <span className={["min-w-0 flex-1 truncate", active ? "font-semibold" : "font-medium"].join(" ")}>
                            {it.label}
                          </span>
                        )}

                        {/* Unread counters */}
                        {it.badgeCount > 0 && (
                          <Badge
                            collapsed={!showText}
                            label={`${it.badgeCount}`}
                            ariaLabel={`${it.badgeCount} notifications`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </nav>

      {/* Trust panel */}
      <div className={["px-4 pt-2", collapsed && !inDrawer ? "hidden" : "block"].join(" ")}>
        {isLoading ? (
          <div className="mt-2 rounded-2xl border border-[color:var(--brand-border)] p-3">
            <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
            <div className="mt-3 space-y-2">
              <div className="h-3 w-44 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-40 bg-gray-100 rounded animate-pulse" />
              <div className="h-3 w-36 bg-gray-100 rounded animate-pulse" />
            </div>
          </div>
        ) : (
          <div className="mt-2 rounded-2xl border border-[color:var(--brand-border)] bg-white p-3">
            <div className="flex items-center gap-2">
              <Icons.BadgeCheck className="h-4 w-4 text-[color:var(--brand-gold)]" />
              <p className="text-sm font-semibold">Compliance</p>
            </div>
            <div className="mt-2 space-y-1 text-xs text-gray-600">
              <p>
                <span className="font-medium text-gray-800">Verified:</span>{" "}
                {verifiedAt ? formatDateLoose(verifiedAt) : "—"}
              </p>
              <p>
                <span className="font-medium text-gray-800">Support:</span> {supportPhone || "—"}
              </p>
              <div className="pt-1 flex flex-wrap gap-2">
                {Array.isArray(policyLinks) &&
                  policyLinks.slice(0, 4).map((l) => (
                    <a
                      key={l.href}
                      href={l.href}
                      className="underline underline-offset-2 hover:text-[color:var(--brand-navy)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-gold)] rounded"
                    >
                      {l.label}
                    </a>
                  ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Sticky footer actions */}
      <div
        className={[
          "mt-4 border-t border-[color:var(--brand-border)]",
          "bg-[color:var(--brand-surface)]",
          "rounded-b-2xl",
          "sticky bottom-0",
        ].join(" ")}
      >
        <div className="p-3 space-y-2">
          {isLoading ? (
            <>
              <div className="h-9 rounded-xl bg-gray-100 animate-pulse" />
              <div className="h-9 rounded-xl bg-gray-100 animate-pulse" />
              <div className="h-9 rounded-xl bg-gray-100 animate-pulse" />
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => handleGo("help-center")}
                className={[
                  "w-full rounded-xl border px-3 py-2 text-sm font-medium",
                  "border-[color:var(--brand-border)] hover:bg-gray-50 active:bg-gray-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-gold)]",
                  "flex items-center gap-2",
                  collapsed && !inDrawer ? "justify-center" : "justify-start",
                ].join(" ")}
                aria-label="Help Center"
                title={collapsed && !inDrawer ? "Help Center" : undefined}
              >
                <Icons.HelpCircle className="h-4 w-4 text-gray-600" />
                {(!collapsed || inDrawer) && <span>Help Center</span>}
              </button>

              <button
                type="button"
                onClick={() => handleGo("contact-officer")}
                className={[
                  "w-full rounded-xl border px-3 py-2 text-sm font-medium",
                  "border-[color:var(--brand-border)] hover:bg-gray-50 active:bg-gray-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-gold)]",
                  "flex items-center gap-2",
                  collapsed && !inDrawer ? "justify-center" : "justify-start",
                ].join(" ")}
                aria-label="Contact Officer"
                title={collapsed && !inDrawer ? "Contact Officer" : undefined}
              >
                <Icons.Phone className="h-4 w-4 text-gray-600" />
                {(!collapsed || inDrawer) && <span>Contact Officer</span>}
              </button>

              <button
                type="button"
                onClick={openLogoutConfirm}
                className={[
                  "w-full rounded-xl px-3 py-2 text-sm font-semibold",
                  "bg-gray-900 text-white hover:bg-black active:bg-black/90",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-gold)]",
                  "flex items-center gap-2",
                  collapsed && !inDrawer ? "justify-center" : "justify-start",
                ].join(" ")}
                aria-label="Logout"
                title={collapsed && !inDrawer ? "Logout" : undefined}
              >
                <Icons.LogOut className="h-4 w-4" />
                {(!collapsed || inDrawer) && <span>Logout</span>}
              </button>
            </>
          )}
        </div>
      </div>
    </aside>
  );

  return (
    <Shell>
      {/* Mobile trigger + behavior rules (drawer with overlay) */}
      <div className="lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className={[
            "w-full rounded-2xl border bg-white px-4 py-3",
            "border-[color:var(--brand-border)]",
            "flex items-center justify-between",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-gold)]",
          ].join(" ")}
          aria-label="Open sidebar menu"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-xl border border-[color:var(--brand-border)] grid place-items-center overflow-hidden bg-white">
              {logoSrc ? (
                <img src={logoSrc} alt={logoAlt} className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-bold text-[color:var(--brand-navy)]">
                  {getInitials(brandName)}
                </span>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold truncate">{userName || "Welcome"}</p>
              <p className="text-xs text-gray-500 truncate">
                {userEmail || `${brandName} • ${userRole}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {(counters?.pendingTasks ?? 0) > 0 && (
              <span className="text-xs font-semibold rounded-full bg-[color:var(--brand-gold)]/20 text-[color:var(--brand-navy)] px-2 py-1">
                {counters.pendingTasks} Tasks
              </span>
            )}
            <Icons.Menu className="h-5 w-5 text-[color:var(--brand-navy)]" />
          </div>
        </button>

        {/* Overlay */}
        <div
          className={[
            "fixed inset-0 z-40 transition-opacity duration-200",
            mobileOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
          ].join(" ")}
          aria-hidden={!mobileOpen}
        >
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
        </div>

        {/* Drawer (bottom-sheet style for mobile) */}
        <div
          className={[
            "fixed left-0 right-0 bottom-0 z-50",
            "transition-transform duration-200 ease-out",
            mobileOpen ? "translate-y-0" : "translate-y-full",
          ].join(" ")}
          role="dialog"
          aria-modal="true"
          aria-label="Sidebar drawer"
        >
          <div className="rounded-t-3xl bg-white border-t border-[color:var(--brand-border)] shadow-2xl max-h-[85vh] overflow-auto">
            <div className="px-4 pt-3 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-10 rounded-full bg-gray-200" aria-hidden="true" />
              </div>
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="rounded-xl border border-[color:var(--brand-border)] px-3 py-2 text-sm hover:bg-gray-50 active:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--brand-gold)]"
                aria-label="Close menu"
              >
                Close
              </button>
            </div>

            <div className="p-4 pt-2">
              {/* In drawer we force expanded view */}
              <SidebarContent inDrawer />
            </div>
          </div>
        </div>
      </div>

      {/* Desktop / Tablet sidebar */}
      <div className="hidden lg:block">
        <SidebarContent />
      </div>

      {showLogoutConfirm ? (
        <div className="fixed inset-0 z-[60] grid place-items-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/45"
            onClick={() => setShowLogoutConfirm(false)}
            aria-label="Close logout confirmation"
          />

          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Confirm Logout</h3>
            <p className="mt-2 text-sm text-slate-600">
              Are you sure you want to logout from your account?
            </p>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmLogout}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-black"
              >
                Yes, Logout
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </Shell>
  );
}




