import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import { clearAdminSession, getAdminUser } from "../../utils/adminAuth";

export default function SettingsPage() {
  const navigate = useNavigate();
  const adminUser = useMemo(() => getAdminUser(), []);

  const logout = () => {
    clearAdminSession();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-slate-500">Admin session and account overview.</p>
      </div>

      <section className="rounded-xl border bg-white p-4 space-y-3">
        <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm">
          <p className="text-slate-500">Logged in as</p>
          <p className="font-semibold">{adminUser?.fullName || "Admin"}</p>
          <p className="text-slate-500">{adminUser?.email || "-"}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={logout}>
            Logout
          </Button>
        </div>
      </section>
    </div>
  );
}

