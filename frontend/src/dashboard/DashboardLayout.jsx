import { useState } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Home, LogOut } from "lucide-react";
import DashboardSidebar from "./DashboardSidebar";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../hooks/useProfile";
import { getKycGate } from "../utils/kycGate";
import { FILE_BASE_URL } from "../config/api";
import { RestockTechSignature } from "../components/Brand/RestockTechLogo.jsx";
import TransitionOverlay from "../components/Preloader/TransitionOverlay.jsx";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { profile, loading } = useProfile();
  const [loggingOut, setLoggingOut] = useState(false);
  const gate = getKycGate(profile);
  const fileBase = FILE_BASE_URL;

  const getActiveSectionFromPath = (pathname) => {
    if (pathname === "/dashboard") return "overview";
    if (pathname === "/dashboard/quick-actions") return "quick-actions";
    if (pathname === "/dashboard/updates") return "updates";
    if (pathname === "/dashboard/my-applications") return "my-applications";
    if (pathname === "/dashboard/apply-loan") return "apply-loan";
    if (pathname === "/dashboard/profile-completion") return "profile-completion";
    if (pathname === "/dashboard/kyc-status") return "kyc-status";
    if (pathname === "/dashboard/repayments") return "repayments";
    if (pathname === "/dashboard/schedule") return "schedule";
    if (pathname === "/dashboard/help-center") return "help-center";
    if (pathname === "/dashboard/contact-officer") return "contact-officer";
    if (pathname === "/dashboard/account-info") return "account-info";
    if (pathname === "/dashboard/profile") return "profile-completion";
    if (pathname === "/dashboard/kyc") return "kyc-status";
    if (pathname === "/dashboard/eligibility") return "overview";
    return "overview";
  };

  const activeSection = getActiveSectionFromPath(location.pathname);

  const handleGoToSection = (sectionKey) => {
    const routeMap = {
      overview: "/dashboard",
      "quick-actions": "/dashboard/quick-actions",
      updates: "/dashboard/updates",
      "my-applications": "/dashboard/my-applications",
      "apply-loan": "/dashboard/apply-loan",
      "profile-completion": "/dashboard/profile-completion",
      "kyc-status": "/dashboard/kyc-status",
      repayments: "/dashboard/repayments",
      schedule: "/dashboard/schedule",
      "help-center": "/dashboard/help-center",
      "contact-officer": "/dashboard/contact-officer",
      "account-info": "/dashboard/account-info",
      security: "/dashboard/profile-completion",
    };

    navigate(routeMap[sectionKey] || "/dashboard");
  };

  const normalizeKycStatus = (status) => {
    const raw = String(status || "").toLowerCase();
    if (raw === "not_started") return "unverified";
    return raw || "unverified";
  };

  const userStatus = gate?.canApply
    ? "Active"
    : gate?.kycStatus === "pending"
    ? "Pending KYC"
    : gate?.kycStatus === "rejected"
    ? "KYC Rejected"
    : "Action Required";

  const avatarSrc = profile?.avatarUrl
    ? profile.avatarUrl.startsWith("http")
      ? profile.avatarUrl
      : `${fileBase}${profile.avatarUrl.startsWith("/") ? profile.avatarUrl : `/${profile.avatarUrl}`}`
    : "";

  const handleLogoutWithLoading = () => {
    setLoggingOut(true);
    window.setTimeout(() => {
      logout();
      navigate("/");
    }, 650);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-4 sm:py-6">
      <TransitionOverlay visible={loggingOut} title="Signing you out" message="Taking you back to the main menu." />
      <div className="mx-auto max-w-7xl px-4 pb-8 md:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Customer Dashboard</p>
            <p className="mt-1 text-sm text-slate-600">Manage your loan, repayments and profile in one place.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RestockTechSignature label="Powered by" className="hidden md:inline-flex" logoClassName="h-9 w-auto" />
            <button
              type="button"
              onClick={() => navigate("/")}
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-[#B38E46]/60 hover:text-[#002D5B]"
            >
              <Home size={16} /> Back to Home
            </button>
            <button
              type="button"
              onClick={handleLogoutWithLoading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-800"
            >
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[250px_minmax(0,1fr)] lg:items-start">
          <DashboardSidebar
            userName={profile?.fullName || user?.fullName || "Welcome"}
            userEmail={profile?.email || user?.email || ""}
            userRole={user?.role || "Customer"}
            userStatus={userStatus}
            logoSrc={avatarSrc}
            logoAlt="User profile photo"
            isLoading={loading}
            profilePercent={Number(profile?.profileCompletion || 0)}
            kycStatus={normalizeKycStatus(profile?.kycStatus)}
            nextRequiredAction={gate?.blockReason || "Review your account tasks"}
            onLogout={handleLogoutWithLoading}
            activeSection={activeSection}
            onGoToSection={handleGoToSection}
          />
          <main className="min-w-0 space-y-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
