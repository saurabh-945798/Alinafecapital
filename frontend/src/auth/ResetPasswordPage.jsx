import { useMemo, useState } from "react";
import { CheckCircle2, Eye, EyeOff, LockKeyhole } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import logoImage from "../../images/logo.png";
import { api } from "../services/api.js";
import { passwordChecks, passwordIsStrong } from "../utils/passwordPolicy.js";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const checks = useMemo(() => passwordChecks(password), [password]);
  const strong = passwordIsStrong(password);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!token) return setError("This reset link is invalid or incomplete. Please request a new one.");
    if (!strong) return setError("Please choose a password that meets all requirements.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setSubmitting(true);
    try {
      await api.post("/auth/reset-password", { token, password, confirmPassword }, { skipRefresh: true });
      setSuccess(true);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "This reset link could not be used. Please request a new one.");
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return <main className="min-h-screen bg-slate-50 px-4 py-8"><div className="mx-auto max-w-xl rounded-[2rem] border bg-white p-8 text-center shadow-xl"><img src={logoImage} alt="Alinafe Capital" className="mx-auto h-16 w-auto"/><CheckCircle2 className="mx-auto mt-6 text-emerald-600" size={42}/><h1 className="mt-4 text-2xl font-bold">Password reset successful</h1><p className="mt-2 text-sm text-slate-600">Your old sessions have been closed. Sign in again using your new password.</p><Link to="/login" className="mt-6 inline-flex rounded-xl bg-[#002D5B] px-5 py-3 text-sm font-bold text-white">Return to login</Link></div></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <img src={logoImage} alt="Alinafe Capital" className="h-14 w-auto" />
        <h1 className="mt-6 text-3xl font-bold text-slate-950">Create a new password</h1>
        <p className="mt-2 text-sm text-slate-600">Your new password must meet the same strong-password rules used during registration.</p>
        {error ? <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
        <form onSubmit={submit} className="mt-6 space-y-4">
          <PasswordField label="New password" value={password} setValue={setPassword} show={showPassword} setShow={setShowPassword} />
          <PasswordField label="Confirm new password" value={confirmPassword} setValue={setConfirmPassword} show={showConfirm} setShow={setShowConfirm} />
          <div className="grid gap-1 rounded-2xl border bg-slate-50 p-4 text-xs text-slate-600 sm:grid-cols-2">
            {Object.entries({length:"12+ characters",upper:"Uppercase",lower:"Lowercase",number:"Number",special:"Special character",identity:"No personal identity",common:"Not a common password"}).map(([key,label]) => <span key={key} className={checks[key] ? "text-emerald-700" : "text-slate-500"}>{checks[key] ? "✓" : "○"} {label}</span>)}
          </div>
          <button disabled={submitting || !token} className="min-h-12 w-full rounded-2xl bg-[#002D5B] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">{submitting ? "Resetting password..." : "Reset password"}</button>
        </form>
      </div>
    </main>
  );
}

function PasswordField({ label, value, setValue, show, setShow }) {
  return <label className="block text-sm font-semibold text-slate-700">{label}<div className="mt-2 flex items-center rounded-2xl border border-slate-300 px-4 focus-within:border-slate-950"><LockKeyhole size={18} className="text-slate-400"/><input type={show?"text":"password"} value={value} onChange={(e)=>setValue(e.target.value)} autoComplete="new-password" className="h-12 w-full bg-transparent px-3 text-sm outline-none"/><button type="button" onClick={()=>setShow((v)=>!v)} className="p-2 text-slate-500" aria-label={show?"Hide password":"Show password"}>{show?<EyeOff size={18}/>:<Eye size={18}/>}</button></div></label>;
}
