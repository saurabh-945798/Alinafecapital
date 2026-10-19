import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Check, Circle, Copy, Eye, EyeOff, LockKeyhole, Mail, Phone, RefreshCw, User, UserPlus } from "lucide-react";
import logoImage from "../../images/logo.png";
import { RestockTechSignature } from "../components/Brand/RestockTechLogo.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../services/api.js";
import { generateStrongPassword, passwordChecks, passwordIsStrong } from "../utils/passwordPolicy.js";

const BRAND_NAVY = "#002D5B";
const BRAND_GOLD = "#B38E46";

const extractAuthData = (payload) => {
  const root = payload?.data ?? payload ?? {};
  const data = root?.data ?? root;
  return { token: data?.accessToken || data?.token || root?.accessToken || root?.token || "", user: data?.user || root?.user || null };
};

const CHECK_LABELS = {
  length: "At least 12 characters",
  upper: "At least one uppercase letter",
  lower: "At least one lowercase letter",
  number: "At least one number",
  special: "At least one special character",
  identity: "Does not contain your name or email",
  common: "Is not a common/easy password",
};

export default function CustomerRegisterPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { setSession } = useAuth();
  const [form, setForm] = useState({ fullName: "", email: "", phone: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copyNotice, setCopyNotice] = useState("");

  const checks = useMemo(() => passwordChecks(form.password, { fullName: form.fullName, email: form.email }), [form.password, form.fullName, form.email]);
  const strong = useMemo(() => passwordIsStrong(form.password, { fullName: form.fullName, email: form.email }), [form.password, form.fullName, form.email]);
  const passwordsMatch = Boolean(form.password) && form.password === form.confirmPassword;

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setCopyNotice("");
  };

  const suggestPassword = () => {
    const next = generateStrongPassword();
    setForm((prev) => ({ ...prev, password: next, confirmPassword: next }));
    setShowPassword(true);
    setCopyNotice("Strong password suggested. Save it somewhere secure.");
  };

  const copyPassword = async () => {
    if (!form.password) return;
    try { await navigator.clipboard.writeText(form.password); setCopyNotice("Password copied. Store it securely."); }
    catch { setCopyNotice("Could not copy automatically. Select the password and copy it manually."); }
  };

  const handleSubmit = async (event) => {
    event.preventDefault(); setError("");
    if (!form.fullName.trim() || !form.email.trim() || !form.phone.trim()) { setError("Enter your full name, email and phone number."); return; }
    if (!strong) { setError("Please complete all password requirements shown below."); return; }
    if (!passwordsMatch) { setError("Passwords do not match."); return; }

    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/register", { fullName: form.fullName.trim(), email: form.email.trim(), phone: form.phone.trim(), password: form.password });
      const auth = extractAuthData(data);
      if (!auth.token) throw new Error("Account was created but login token was not returned.");
      setSession({ token: auth.token, user: auth.user });
      const next = searchParams.get("next");
      const safeNext = next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
      navigate(safeNext, { replace: true });
    } catch (err) {
      const details = err?.response?.data?.details;
      setError((Array.isArray(details) && details.length ? details.join(" ") : "") || err?.response?.data?.message || err?.message || "Could not create customer login. Please confirm the details and try again.");
    } finally { setSubmitting(false); }
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#eef4ff_0%,#f8fbff_42%,#ffffff_76%)] px-4 py-8">
      <div className="mx-auto max-w-3xl">
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.10)] sm:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4"><Link to="/" className="inline-flex items-center gap-3"><img src={logoImage} alt="Alinafe Capital" className="h-14 w-auto object-contain sm:h-16"/><div><p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-700">Alinafe Capital</p><p className="text-xs text-slate-500">Customer access setup</p></div></Link><RestockTechSignature label="Powered by" logoClassName="h-10 w-auto"/></div>
          <Link to="/" className="mt-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:text-slate-950"><ArrowLeft size={16}/> Back to Home</Link>
          <div className="mt-8"><span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600"><UserPlus size={14}/> Customer login setup</span><h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-950">Create your customer account</h1><p className="mt-3 text-sm leading-6 text-slate-600">Create an account before applying so your loan request, KYC status and future repayments can be linked to you securely.</p></div>

          <form onSubmit={handleSubmit} className="mt-8 grid gap-4 sm:grid-cols-2">
            {error ? <div className="sm:col-span-2 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
            <Field icon={User} label="Full name" name="fullName" value={form.fullName} onChange={handleChange} placeholder="Your full name" autoComplete="name"/>
            <Field icon={Mail} label="Email address" name="email" value={form.email} onChange={handleChange} placeholder="example@email.com" autoComplete="email"/>
            <Field icon={Phone} label="Phone number" name="phone" value={form.phone} onChange={handleChange} placeholder="0999..." autoComplete="tel"/>

            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">Password
              <div className="mt-2 flex items-center rounded-2xl border border-slate-300 bg-white px-4 focus-within:border-slate-900"><LockKeyhole size={18} className="text-slate-400"/><input name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={handleChange} placeholder="Create a strong password" autoComplete="new-password" className="h-12 w-full border-0 bg-transparent px-3 text-sm outline-none"/><button type="button" onClick={()=>setShowPassword((v)=>!v)} className="p-2 text-slate-500" aria-label={showPassword?"Hide password":"Show password"}>{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>
            </label>
            <label className="block text-sm font-semibold text-slate-700 sm:col-span-2">Confirm password
              <div className="mt-2 flex items-center rounded-2xl border border-slate-300 bg-white px-4 focus-within:border-slate-900"><LockKeyhole size={18} className="text-slate-400"/><input name="confirmPassword" type={showPassword ? "text" : "password"} value={form.confirmPassword} onChange={handleChange} placeholder="Repeat password" autoComplete="new-password" className="h-12 w-full border-0 bg-transparent px-3 text-sm outline-none"/></div>
            </label>

            <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-sm font-bold text-slate-900">Password requirements</p><p className="text-xs text-slate-500">These update while you type.</p></div><div className="flex gap-2"><button type="button" onClick={suggestPassword} className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-xs font-semibold"><RefreshCw size={13}/>Suggest Strong Password</button><button type="button" onClick={copyPassword} disabled={!form.password} className="inline-flex items-center gap-1.5 rounded-lg border bg-white px-3 py-2 text-xs font-semibold disabled:opacity-50"><Copy size={13}/>Copy</button></div></div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">{Object.entries(CHECK_LABELS).map(([key,label])=><div key={key} className={`flex items-center gap-2 text-xs ${checks[key]?"text-emerald-700":"text-slate-500"}`}>{checks[key]?<Check size={14}/>:<Circle size={12}/>}<span>{label}</span></div>)}<div className={`flex items-center gap-2 text-xs ${passwordsMatch?"text-emerald-700":"text-slate-500"}`}>{passwordsMatch?<Check size={14}/>:<Circle size={12}/>}<span>Password and confirmation match</span></div></div>
              {copyNotice ? <p className="mt-3 text-xs font-medium text-blue-700">{copyNotice}</p> : null}
            </div>

            <div className="sm:col-span-2"><button type="submit" disabled={submitting || !strong || !passwordsMatch} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50" style={{ background: `linear-gradient(135deg, ${BRAND_NAVY}, #13427b 70%, ${BRAND_GOLD})` }}>{submitting?"Creating account...":"Create account and continue"}<ArrowRight size={17}/></button></div>
          </form>
          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600"><span>Already have access? <Link to="/login" className="font-bold text-slate-900 hover:underline">Sign in here</Link>.</span></div>
        </section>
      </div>
    </main>
  );
}
function Field({icon:Icon,label,...inputProps}){return <label className="block text-sm font-semibold text-slate-700">{label}<div className="mt-2 flex items-center rounded-2xl border border-slate-300 bg-white px-4 focus-within:border-slate-900"><Icon size={18} className="text-slate-400"/><input {...inputProps} className="h-12 w-full border-0 bg-transparent px-3 text-sm outline-none"/></div></label>}
