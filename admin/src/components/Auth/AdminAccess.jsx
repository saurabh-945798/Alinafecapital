import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Button from "../ui/Button";
import { getEnvAdminKey, setLocalAdminKey } from "../../utils/adminAuth";

export default function AdminAccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [key, setKey] = useState("");

  const envKeyPresent = useMemo(() => Boolean(getEnvAdminKey()), []);
  const nextPath = searchParams.get("next") || "/admin";

  const submit = (e) => {
    e.preventDefault();
    if (!key.trim()) return;
    setLocalAdminKey(key);
    navigate(nextPath, { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4">
      <div className="mx-auto mt-16 w-full max-w-md rounded-xl border bg-white p-5 space-y-4">
        <div>
          <h1 className="text-xl font-bold">Admin Access</h1>
          <p className="text-sm text-slate-500">Enter your admin key to continue.</p>
        </div>

        {envKeyPresent ? (
          <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            Environment key is configured. You can continue after setting local key only if needed.
          </p>
        ) : null}

        <form onSubmit={submit} className="space-y-3">
          <input
            type="password"
            value={key}
            onChange={(e) => setKey(e.target.value)}
            placeholder="Admin API key"
            className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
          />
          <Button type="submit" className="w-full">
            Continue
          </Button>
        </form>
      </div>
    </div>
  );
}

