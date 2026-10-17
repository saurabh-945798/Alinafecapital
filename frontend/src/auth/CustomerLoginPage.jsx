import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight, LockKeyhole, Phone, ShieldCheck, UserPlus, WalletCards } from "lucide-react";
import logoImage from "../../images/logo.png";
import { RestockTechSignature } from "../components/Brand/RestockTechLogo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";

const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";

const extractAuthData = (payload) => {
  const root = payload?.data ?? payload ?? {};
  const data = root?.data ?? root;
  return {
    token: data?.accessToken || data?.token || root?.accessToken || root?.token || "",
    user: data?.user || root?.user || null,
  };
};

export default function CustomerLoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setSession, isAuthenticated } = useAuth();
  const [form, setForm] = useState({ loginId: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const nextPath = useMemo(() => {
    const params = new URLSearchParams(location.search || "");
    const raw = params.get("next") || location.state?.from?.pathname || "/dashboard/repayments";
    return raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard/repayments";
  }, [location.search, location.state]);

  useEffect(() => {
    if (isAuthenticated) {
      navigate(nextPath, { replace: true });
    }
  }, [isAuthenticated, navigate, nextPath]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const loginId = form.loginId.trim();
    if (!loginId || !form.password) {
      setError("Please enter your registered phone/email and password.");
      return;
    }

    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/login", {
        loginId,
        password: form.password,
      });
      const auth = extractAuthData(data);
      if (!auth.token) {
        throw new Error("Your login was received, but the dashboard could not open. Please try again.");
      }
      setSession({ token: auth.token, user: auth.user });
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "We could not sign you in. Please check your details and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#eef4ff_0%,#f8fbff_42%,#ffffff_76%)] px-4 py-6 sm:py-8">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-6xl items-center gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:gap-8">
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <Link to="/" className="inline-flex items-center gap-3">
              <img src={logoImage} alt="Alinafe Capital" className="h-14 w-auto object-contain sm:h-16" />
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-700">Alinafe Capital</p>
                <p className="text-xs text-slate-500">Customer access</p>
              </div>
            </Link>
            <RestockTechSignature label="Powered by" logoClassName="h-10 w-auto" />
          </div>

          <Link
            to="/"
            className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-950"
          >
            <ArrowLeft size={16} /> Back to Home
          </Link>

          <div className="mt-6">
            <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600">
              <LockKeyhole size={14} /> Customer login
            </span>
            <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
              Welcome back to your loan account.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-slate-600">
              Sign in with the phone number or email used for your loan application to view your loan and manage repayments.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {error ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            <label className="block text-sm font-semibold text-slate-700">
              Email address or phone number
              <div className="mt-2 flex items-center rounded-2xl border border-slate-300 bg-white px-4 focus-within:border-slate-900">
                <Phone size={18} className="text-slate-400" />
                <input
                  name="loginId"
                  value={form.loginId}
                  onChange={handleChange}
                  placeholder="example@email.com or 0999..."
                  className="h-12 w-full border-0 bg-transparent px-3 text-sm outline-none"
                  autoComplete="username"
                />
              </div>
            </label>

            <label className="block text-sm font-semibold text-slate-700">
              Password
              <div className="mt-2 flex items-center rounded-2xl border border-slate-300 bg-white px-4 focus-within:border-slate-900">
                <LockKeyhole size={18} className="text-slate-400" />
                <input
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  type="password"
                  placeholder="Enter your password"
                  className="h-12 w-full border-0 bg-transparent px-3 text-sm outline-none"
                  autoComplete="current-password"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-70"
              style={{ background: `linear-gradient(135deg, ${BRAND_NAVY}, #13427b 70%, ${BRAND_GOLD})` }}
            >
              {submitting ? "Opening your dashboard..." : "Sign in"}
              <ArrowRight size={17} />
            </button>
          </form>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-600">
            <p className="font-semibold text-slate-800">First time accessing your dashboard?</p>
            <p className="mt-1">
              Create your customer login using the same email and phone number used on your loan application, or contact Alinafe Capital for assistance.
            </p>
            <Link to="/register" className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-slate-900 hover:underline">
              <UserPlus size={16} /> Create customer login
            </Link>
          </div>
        </section>

        <aside className="rounded-[2rem] border border-slate-200 bg-slate-950 p-6 text-white shadow-[0_24px_80px_rgba(15,23,42,0.22)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/60">Repayment options</p>
          <h2 className="mt-3 text-2xl font-bold">Pay your loan in a way that works for you.</h2>
          <p className="mt-3 text-sm leading-6 text-white/70">
            Once your loan has been disbursed, your dashboard will show available repayment choices including card and Airtel Money options.
          </p>
          <div className="mt-6 space-y-4 text-sm leading-6 text-white/75">
            {[
              { icon: WalletCards, text: "View your active loan and outstanding balance." },
              { icon: ShieldCheck, text: "Choose the amount you want to pay and how you want to pay." },
              { icon: LockKeyhole, text: "Complete your payment and receive confirmation on your account." },
            ].map(({ icon: Icon, text }, index) => (
              <div key={text} className="flex gap-3 rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-950">
                  <Icon size={16} />
                </span>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-white/45">Step {index + 1}</p>
                  <p>{text}</p>
                </div>
              </div>
            ))}
          </div>

        </aside>
      </div>
    </main>
  );
}
