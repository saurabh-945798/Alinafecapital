import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../ui/Button";
import { adminAuthApi } from "../../services/api/auth.api";
import { setAdminToken, setAdminUser } from "../../utils/adminAuth";

export default function AdminAccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nextPath = searchParams.get("next") || "/admin";

  const normalizeMwPhoneForLogin = (value) => {
    const raw = String(value || "").trim().replace(/[^\d+]/g, "");
    if (!raw) return "";
    if (raw.startsWith("+265")) return raw;
    if (raw.startsWith("265")) return `+${raw}`;
    if (raw.startsWith("0")) return `+265${raw.slice(1)}`;
    if (/^\d{9}$/.test(raw)) return `+265${raw}`;
    return raw;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const normalizedPhone = normalizeMwPhoneForLogin(phone);
      const res = await adminAuthApi.login({ phone: normalizedPhone, password });
      const payload = res?.data || res || {};
      const token = payload.accessToken || payload.token || "";
      const user = payload.user || null;

      if (!token) {
        throw new Error("Login response did not include access token.");
      }
      if (!user || user.role !== "admin") {
        throw new Error("You are not authorized to access admin panel.");
      }

      setAdminToken(token);
      setAdminUser(user);
      navigate(nextPath, { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto mt-16 w-full max-w-md rounded-xl border bg-white p-5 space-y-4">
        <div>
          <h1 className="text-xl font-bold">Admin Login</h1>
          <p className="text-sm text-slate-500">Sign in with your admin account.</p>
        </div>

        {error ? (
          <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}

        <form onSubmit={submit} className="space-y-3">
          <input
            type="text"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Phone (e.g. 881234567)"
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
            required
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
            required
          />
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Signing in..." : "Login"}
          </Button>
        </form>
      </div>
    </div>
  );
}
