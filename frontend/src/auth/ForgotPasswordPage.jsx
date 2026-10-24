import { useState } from "react";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import logoImage from "../../images/logo.png";
import { RestockTechSignature } from "../components/Brand/RestockTechLogo.jsx";
import { api } from "../services/api.js";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    setMessage("");
    setSubmitting(true);
    try {
      const { data } = await api.post("/auth/forgot-password", { email: email.trim().toLowerCase() }, { skipRefresh: true });
      setMessage(data?.data?.message || data?.message || "If the email is registered, reset instructions have been sent.");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Password reset is temporarily unavailable. Please try again later.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8">
      <div className="mx-auto max-w-xl rounded-[2rem] border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="flex items-center justify-between gap-4">
          <Link to="/" className="inline-flex items-center gap-3">
            <img src={logoImage} alt="Alinafe Capital" className="h-14 w-auto object-contain" />
            <div><p className="text-sm font-bold">Alinafe Capital</p><p className="text-xs text-slate-500">Customer password reset</p></div>
          </Link>
          <RestockTechSignature label="Powered by" logoClassName="h-9 w-auto" />
        </div>

        <Link to="/login" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 hover:text-slate-950">
          <ArrowLeft size={16} /> Back to login
        </Link>

        <div className="mt-6">
          <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-700"><ShieldCheck size={14}/> Secure reset</span>
          <h1 className="mt-4 text-3xl font-bold text-slate-950">Forgot your password?</h1>
          <p className="mt-2 text-sm leading-6 text-slate-600">Enter the email address registered on your Alinafe Capital customer account. If it is registered, we will send a one-time reset link.</p>
        </div>

        <form onSubmit={submit} className="mt-7 space-y-4">
          {message ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{message}</div> : null}
          {error ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">{error}</div> : null}
          <label className="block text-sm font-semibold text-slate-700">
            Registered email address
            <div className="mt-2 flex items-center rounded-2xl border border-slate-300 px-4 focus-within:border-slate-950">
              <Mail size={18} className="text-slate-400" />
              <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required autoComplete="email" className="h-12 w-full bg-transparent px-3 text-sm outline-none" placeholder="name@example.com" />
            </div>
          </label>
          <button disabled={submitting} className="min-h-12 w-full rounded-2xl bg-[#002D5B] px-5 py-3 text-sm font-bold text-white disabled:opacity-60">
            {submitting ? "Sending reset instructions..." : "Send reset instructions"}
          </button>
        </form>
      </div>
    </main>
  );
}
