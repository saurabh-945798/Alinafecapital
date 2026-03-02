import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronLeft, Eye, EyeOff } from "lucide-react";
import authApi from "../services/auth.api";
import { useAuth } from "../context/AuthContext";

export default function Signup() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, setSession } = useAuth();

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  });

  const [errors, setErrors] = useState({});
  const [errorBox, setErrorBox] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      const nextPath = searchParams.get("next");
      navigate(nextPath || "/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate, searchParams]);

  const validateField = (name, value) => {
    let message = "";

    if (name === "fullName" && value.trim().length < 3) {
      message = "Enter your full name.";
    }

    if (name === "email" && !/\S+@\S+\.\S+/.test(value)) {
      message = "Enter a valid email address.";
    }

    if (name === "phone" && !/^\d{9}$/.test(value)) {
      message = "Enter a valid Malawi number (9 digits).";
    }

    if (name === "password" && !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(value)) {
      message = "8+ chars, 1 uppercase, 1 lowercase, 1 number.";
    }

    if (name === "confirmPassword" && value !== form.password) {
      message = "Passwords do not match.";
    }
    if (name === "confirmPassword" && !value) {
      message = "Confirm your password.";
    }
    if (name === "acceptTerms" && !value) {
      message = "You must accept Terms and Conditions.";
    }

    setErrors((prev) => ({ ...prev, [name]: message }));
    return message;
  };

  const onChange = (e) => {
    const { name, value, type, checked } = e.target;

    if (type === "checkbox") {
      setForm((prev) => ({ ...prev, [name]: checked }));
      validateField(name, checked);
      return;
    }

    if (name === "phone") {
      const digits = value.replace(/\D/g, "").slice(0, 9);
      setForm((prev) => ({ ...prev, phone: digits }));
      validateField(name, digits);
      return;
    }

    setForm((prev) => ({ ...prev, [name]: value }));
    validateField(name, value);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorBox("");
    setLoading(true);

    const nextErrors = {
      fullName: validateField("fullName", form.fullName),
      email: validateField("email", form.email),
      phone: validateField("phone", form.phone),
      password: validateField("password", form.password),
      confirmPassword: validateField("confirmPassword", form.confirmPassword),
      acceptTerms: validateField("acceptTerms", form.acceptTerms),
    };

    if (Object.values(nextErrors).some(Boolean)) {
      setLoading(false);
      return;
    }

    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        phone: `+265${form.phone}`,
        password: form.password,
      };

      const result = await authApi.register(payload);

      if (!result.token) {
        setErrorBox("Signup failed. Please try again.");
        setLoading(false);
        return;
      }

      setSuccess(true);

      setTimeout(() => {
        setSession({ token: result.token, user: result.user });
        const nextPath = searchParams.get("next");
        navigate(nextPath || "/dashboard", { replace: true });
      }, 1200);
    } catch (err) {
      setErrorBox(err?.response?.data?.message || "Signup failed.");
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid md:grid-cols-2 gap-10 items-center">
        <div className="hidden md:block space-y-6">
          <Link to="/" className="inline-flex items-center gap-1 text-sm text-[#002D5B] font-medium">
            <ChevronLeft size={16} /> Back to Home
          </Link>

          <h2 className="text-3xl font-bold text-[#002D5B]">
            Create account to start your loan journey
          </h2>

          <p className="text-gray-600">Fast approval. Transparent process. Built for Malawi.</p>
        </div>

        <div className="flex justify-center">
          <form
            onSubmit={onSubmit}
            className="w-full max-w-[460px] bg-white border rounded-xl shadow-sm p-6 md:p-8 space-y-4"
          >
            <Link to="/" className="md:hidden inline-flex items-center gap-1 text-sm text-[#002D5B]">
              <ChevronLeft size={16} /> Back to Home
            </Link>

            <div>
              <p className="text-xs text-[#B38E46] font-medium">Step 1 of 3: Create account</p>
              <h1 className="text-2xl font-semibold text-[#002D5B]">Create Account</h1>
            </div>

            {errorBox ? <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg">{errorBox}</div> : null}
            {success ? <div className="bg-green-50 text-green-600 text-sm p-3 rounded-lg">Account created successfully!</div> : null}

            <div>
              <label className="text-sm font-medium">
                Full Name <span className="text-red-600">*</span>
              </label>
              <input
                type="text"
                name="fullName"
                value={form.fullName}
                onChange={onChange}
                required
                placeholder="Full name"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#B38E46]"
              />
              {errors.fullName ? <p className="text-xs text-red-600 mt-1">{errors.fullName}</p> : null}
            </div>

            <div>
              <label className="text-sm font-medium">
                Email <span className="text-red-600">*</span>
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                required
                placeholder="Email address"
                className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-[#B38E46]"
              />
              {errors.email ? <p className="text-xs text-red-600 mt-1">{errors.email}</p> : null}
            </div>

            <div>
              <label className="text-sm font-medium">
                Phone Number <span className="text-red-600">*</span>
              </label>
              <div className="mt-1 flex overflow-hidden rounded-lg border border-slate-300 focus-within:ring-2 focus-within:ring-[#B38E46]">
                <span className="inline-flex items-center border-r border-slate-300 bg-slate-50 px-3 text-sm font-medium text-slate-700">
                  +265
                </span>
                <input
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={onChange}
                  placeholder="881234567"
                  maxLength={9}
                  inputMode="numeric"
                  required
                  className="w-full px-3 py-2.5 focus:outline-none"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">Example: 881234567 (without +265).</p>
              {errors.phone ? <p className="text-xs text-red-600 mt-1">{errors.phone}</p> : null}
            </div>

            <div>
              <label className="text-sm font-medium">
                Password <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={onChange}
                  required
                  placeholder="Password"
                  className="w-full border rounded-lg px-3 py-2 pr-12 focus:ring-2 focus:ring-[#B38E46]"
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
              <p className="text-xs text-gray-500">8+ chars, 1 uppercase, 1 lowercase, 1 number</p>
              {errors.password ? <p className="text-xs text-red-600 mt-1">{errors.password}</p> : null}
            </div>

            <div>
              <label className="text-sm font-medium">
                Confirm Password <span className="text-red-600">*</span>
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={onChange}
                  required
                  placeholder="Confirm password"
                  className="w-full border rounded-lg px-3 py-2 pr-12 focus:ring-2 focus:ring-[#B38E46]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-[#002D5B]"
                  aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {errors.confirmPassword ? <p className="text-xs text-red-600 mt-1">{errors.confirmPassword}</p> : null}
            </div>

            <div className="space-y-1">
              <label className="inline-flex items-start gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  name="acceptTerms"
                  checked={form.acceptTerms}
                  onChange={onChange}
                  className="mt-0.5"
                />
                <span>
                  I agree to the{" "}
                  <Link to="/terms" className="text-[#002D5B] underline">
                    Terms and Conditions
                  </Link>
                  .
                </span>
              </label>
              {errors.acceptTerms ? <p className="text-xs text-red-600">{errors.acceptTerms}</p> : null}
            </div>

            <button
              type="submit"
              disabled={loading || !form.acceptTerms}
              className="w-full bg-[#002D5B] text-white py-2 rounded-lg font-medium disabled:opacity-60"
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>

            <p className="text-xs text-gray-500 text-center">
              We use your info only for account and loan processing.
            </p>

            <p className="text-sm text-center">
              Already have an account?{" "}
              <Link to="/login" className="text-[#B38E46] font-medium">
                Login
              </Link>
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
