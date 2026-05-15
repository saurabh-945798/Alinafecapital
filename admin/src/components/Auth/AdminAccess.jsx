import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../ui/Button";
import { adminAuthApi } from "../../services/api/auth.api";
import { setAdminToken, setAdminUser } from "../../utils/adminAuth";
import { ADMIN_ROLES, normalizeAdminRole } from "../../utils/adminRbac";
import { useToast } from "../../context/ToastContext.jsx";

export default function AdminAccessPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nextPath = searchParams.get("next") || "/admin";

  const roleHome = (role) => {
    const r = normalizeAdminRole(role);
    if (r === "SUPER_ADMIN") return "/admin";
    if (r === "DISBURSED") return "/admin/payments";
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

      if (!token) {
        throw new Error("Login response did not include access token.");
      }
      const userRole = normalizeAdminRole(user?.role);
      if (!user || !ADMIN_ROLES.includes(userRole)) {
        throw new Error("You are not authorized to access admin panel.");
      }
      user.role = userRole;

      setAdminToken(token);
      setAdminUser(user);
      const defaultPath = roleHome(user.role);
      const safeNext =
        nextPath && nextPath.startsWith("/admin") && !nextPath.startsWith("/admin/user-access")
          ? nextPath
          : defaultPath;
      navigate(safeNext, { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Login failed";
      setError(msg);
      toast.error(msg);
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
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
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
