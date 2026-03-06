import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff, ShieldCheck, ChevronLeft } from "lucide-react";
import authApi from "../services/auth.api";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, setSession } = useAuth();

  const [form, setForm] = useState({ loginId: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const isEmailLike = /[A-Za-z@._-]/.test(String(form.loginId || ""));

  useEffect(() => {
    if (isAuthenticated) {
      const nextPath = searchParams.get("next");
      navigate(nextPath || "/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate, searchParams]);

  const onChange = (e) => {
    const { name, value } = e.target;
    if (name === "loginId") {
      // If input looks like email/username text, keep full value.
      if (/[A-Za-z@._-]/.test(value)) {
        setForm((prev) => ({ ...prev, loginId: value.trim() }));
        return;
      }

      const digits = value.replace(/\D/g, "");
      let local = digits;
      if (local.startsWith("265")) local = local.slice(3);
      if (local.startsWith("0")) local = local.slice(1);
      local = local.slice(0, 9);
      setForm((prev) => ({ ...prev, loginId: local }));
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      let loginId = String(form.loginId || "").trim();
      if (!loginId) {
        setError("Enter your email or phone number.");
        setLoading(false);
        return;
      }

      if (!isEmailLike) {
        const localDigits = loginId.replace(/\D/g, "");
        if (localDigits.length !== 9) {
          setError("Enter a valid Malawi phone number (9 digits).");
          setLoading(false);
          return;
        }
        loginId = `+265${localDigits}`;
      }

      const result = await authApi.login({ loginId, password: form.password });

      if (!result.token) {
        setError("Invalid email/phone or password.");
        setLoading(false);
        return;
      }

      setSession({ token: result.token, user: result.user });

      const nextPath = searchParams.get("next");
      navigate(nextPath || "/dashboard", { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-4 md:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-2rem)] w-full max-w-6xl items-center gap-10 md:grid-cols-2">
        <div className="hidden md:block space-y-7">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm font-medium text-[#002D5B] hover:opacity-80"
          >
            <ChevronLeft size={16} /> Back to Home
          </Link>

          <div className="space-y-4">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#002D5B]/15 bg-white px-3 py-1 text-xs font-semibold text-[#002D5B]">
              <ShieldCheck size={14} /> Secure Client Access
            </p>

            <h2 className="text-4xl font-bold leading-tight text-[#002D5B]">
              Login to continue your loan application
            </h2>

            <p className="max-w-md text-gray-600">
              Access your dashboard, track your application, and manage repayments in one place.
            </p>
          </div>

          <div className="space-y-3 text-sm text-slate-700">
            <p>Secure login with protected account access</p>
            <p>Simple process designed for Malawi customers</p>
            <p>Clear updates on your profile, KYC, and application</p>
          </div>
        </div>

        <div className="w-full flex justify-center">
          <form
            onSubmit={onSubmit}
            className="w-full max-w-[430px] space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_12px_40px_rgba(2,6,23,0.08)] md:p-8"
          >
            <Link
              to="/"
              className="md:hidden inline-flex items-center gap-1 text-sm font-medium text-[#002D5B]"
            >
              <ChevronLeft size={16} /> Back to Home
            </Link>

            <div>
              <h1 className="text-2xl font-semibold text-[#002D5B]">Client Login</h1>
              <p className="mt-1 text-sm text-gray-500">Enter email or phone and password to continue.</p>
            </div>

            {error ? <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div> : null}

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="loginId">
                Email or Phone Number <span className="text-red-600">*</span>
              </label>
              {isEmailLike ? (
                <input
                  id="loginId"
                  type="email"
                  name="loginId"
                  value={form.loginId}
                  onChange={onChange}
                  placeholder="you@example.com"
                  required
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#B38E46]"
                />
              ) : (
                <div className="flex overflow-hidden rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-[#B38E46]">
                  <span className="inline-flex items-center border-r border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-700">
                    +265
                  </span>
                  <input
                    id="loginId"
                    type="tel"
                    name="loginId"
                    value={form.loginId}
                    onChange={onChange}
                    placeholder="881234567"
                    required
                    maxLength={9}
                    inputMode="numeric"
                    className="w-full px-3 py-2.5 focus:outline-none"
                  />
                </div>
              )}
              <p className="text-xs text-gray-500">
                Use your email, or Malawi phone (e.g. 881234567 / +265881234567).
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-gray-700" htmlFor="password" >
                Password <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  required
                  placeholder="Password"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 pr-12 focus:outline-none focus:ring-2 focus:ring-[#B38E46]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#002D5B]"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[#002D5B] py-2.5 font-semibold text-white transition hover:bg-[#012f5f] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Logging in..." : "Login"}
            </button>

            <p className="text-center text-sm">
              New here?{" "}
              <Link to="/signup" className="font-medium text-[#B38E46] hover:underline">
                Create account
              </Link>
            </p>

            <div className="border-t pt-3 text-center text-xs text-gray-500">
              Secure login - Your data is protected
            </div>
          </form>
        </div>
      </div>
    </section>
  );
}
