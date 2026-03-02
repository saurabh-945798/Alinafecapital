import { Outlet, useLocation, useNavigate } from "react-router-dom";
import DashboardSidebar from "./DashboardSidebar";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../hooks/useProfile";
import { getKycGate } from "../utils/kycGate";
import { FILE_BASE_URL } from "../config/api";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { profile, loading } = useProfile();
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

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[250px_1fr]">
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
            onLogout={() => {
              logout();
              navigate("/login");
            }}
            activeSection={activeSection}
            onGoToSection={handleGoToSection}
          />
          <main className="space-y-6">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
