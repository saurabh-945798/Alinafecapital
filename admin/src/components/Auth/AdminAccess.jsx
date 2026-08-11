import { useState } from "react";
import { ShieldCheck, LockKeyhole, Mail, ArrowRight, BarChart3, Users, WalletCards } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../ui/Button";
import { adminAuthApi } from "../../services/api/auth.api";
import { setAdminToken, setAdminUser } from "../../utils/adminAuth";
import { ADMIN_ROLES, normalizeAdminRole } from "../../utils/adminRbac";
import { useToast } from "../../context/ToastContext.jsx";
import alinafeLogo from "../../assets/alinafe-logo.png";
import restockLogo from "../../assets/restock-tech-logo.png";
import AdminLoadingScreen from "../Loading/AdminLoadingScreen.jsx";

const featureItems = [
  { icon: ShieldCheck, title: "Controlled access", copy: "Role-based reviews, approvals and disbursements." },
  { icon: WalletCards, title: "Repayment oversight", copy: "Monitor card and Airtel Money repayments from one console." },
  { icon: BarChart3, title: "Operational reports", copy: "Track loan activity, collections and reconciliation status." },
];

export default function AdminAccessPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [transitionMessage, setTransitionMessage] = useState("");
  const [error, setError] = useState("");

  const nextPath = searchParams.get("next") || "/admin";

  const roleHome = (role) => {
    const r = normalizeAdminRole(role);
    if (r === "SUPER_ADMIN") return "/admin";
    if (r === "DISBURSED" || r === "DISBURSER") return "/admin/payments";
    return "/admin/applications";
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const normalizedEmail = String(email || "").trim().toLowerCase();
      const res = await adminAuthApi.login({ email: normalizedEmail, password });
      const payload = res?.data || res || {};
      const token = payload.accessToken || payload.token || "";
      const user = payload.user || null;

      if (!token) throw new Error("Login response did not include access token.");
      const userRole = normalizeAdminRole(user?.role);
      if (!user || !ADMIN_ROLES.includes(userRole)) {
        throw new Error("You are not authorized to access the admin panel.");
      }
      user.role = userRole;

      setAdminToken(token);
      setAdminUser(user);
      const defaultPath = roleHome(user.role);
      const safeNext =
        nextPath && nextPath.startsWith("/admin") && !nextPath.startsWith("/admin/user-access")
          ? nextPath
          : defaultPath;

      setTransitionMessage("Opening admin workspace...");
      window.setTimeout(() => {
        navigate(safeNext, { replace: true });
      }, 700);
    } catch (err) {
      setTransitionMessage("");
      const msg = err?.response?.data?.message || err?.message || "Login failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#eef4ff_0%,#f7fbff_34%,#ffffff_72%)]">
      {transitionMessage ? (
        <AdminLoadingScreen
          message={transitionMessage}
          subtext="Loading your assigned admin tools and secure workspace."
        />
      ) : null}
      <div className="mx-auto grid min-h-screen max-w-6xl items-center gap-8 px-4 py-10 lg:grid-cols-[1fr_440px] lg:px-8">
        <section className="hidden lg:block">
          <div className="inline-flex items-center gap-3 rounded-3xl border border-slate-200 bg-white/85 px-4 py-3 shadow-sm backdrop-blur">
            <img src={alinafeLogo} alt="Alinafe Capital" className="h-12 w-auto object-contain" />
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-700">Alinafe Capital</p>
              <p className="text-sm text-slate-500">Secure administration console</p>
            </div>
          </div>

          <div className="mt-10 max-w-xl">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#B38E46]">Admin Operations</p>
            <h1 className="mt-4 text-5xl font-black leading-tight tracking-tight text-slate-950">
              Manage loan operations with clarity and control.
            </h1>
            <p className="mt-5 text-base leading-8 text-slate-600">
              Review KYC, approve loan requests, authorize cases, disburse funds and monitor repayments from one protected workspace.
            </p>
          </div>

          <div className="mt-8 grid gap-3 sm:grid-cols-3">
            {featureItems.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm backdrop-blur">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                    <Icon size={18} />
                  </div>
                  <p className="mt-3 text-sm font-bold text-slate-900">{item.title}</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">{item.copy}</p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="w-full rounded-[2rem] border border-slate-200 bg-white/95 p-6 shadow-[0_30px_90px_rgba(15,23,42,0.13)] backdrop-blur sm:p-8">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
                <img src={alinafeLogo} alt="Alinafe Capital" className="h-10 w-auto object-contain" />
              </div>
              <div>
                <p className="text-xl font-black text-slate-950">Admin Login</p>
                <p className="text-sm text-slate-500">Sign in to continue.</p>
              </div>
            </div>
            <div className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-2 sm:flex sm:items-center sm:gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Powered by</span>
              <img src={restockLogo} alt="Restock Tech" className="h-8 w-auto object-contain" />
            </div>
          </div>

          {error ? (
            <p className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>
          ) : null}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm font-semibold text-slate-700">
              Email address
              <div className="mt-2 flex items-center rounded-2xl border border-slate-300 bg-white px-4 focus-within:border-slate-950">
                <Mail size={18} className="text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@alinafecapital.com"
                  className="h-12 w-full bg-transparent px-3 text-sm outline-none"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Password
              <div className="mt-2 flex items-center rounded-2xl border border-slate-300 bg-white px-4 focus-within:border-slate-950">
                <LockKeyhole size={18} className="text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="h-12 w-full bg-transparent px-3 text-sm outline-none"
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>

            <Button type="submit" className="min-h-12 w-full rounded-2xl" disabled={loading}>
              {loading ? "Checking details..." : "Login to Admin Panel"}
              {!loading ? <ArrowRight size={17} className="ml-2 inline" /> : null}
            </Button>
          </form>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-6 text-slate-600">
            Access is restricted to authorized Alinafe Capital staff only. All sensitive actions should be performed using assigned staff credentials.
          </div>
        </section>
      </div>
    </main>
  );
}
