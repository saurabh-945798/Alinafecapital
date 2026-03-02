import { useMemo, useState } from "react";
import Button from "../ui/Button";
import { getEnvAdminKey, getLocalAdminKey, setLocalAdminKey, clearLocalAdminKey } from "../../utils/adminAuth";
import { useToast } from "../../context/ToastContext.jsx";

const MASK = "********";

export default function SettingsPage() {
  const toast = useToast();
  const envKey = useMemo(() => getEnvAdminKey(), []);
  const [adminKey, setAdminKey] = useState(() => getLocalAdminKey());

  const activeKeySource = envKey ? "Environment (.env)" : adminKey ? "Local override" : "Not set";

  const saveKey = () => {
    setLocalAdminKey(adminKey);
    toast.success("Admin key saved locally.");
  };

  const clearKey = () => {
    setAdminKey("");
    clearLocalAdminKey();
    toast.info("Local admin key cleared.");
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-sm text-slate-500">Manage admin access key.</p>
      </div>

      <section className="rounded-xl border bg-white p-4 space-y-3">
        <div className="rounded-lg border bg-slate-50 px-3 py-2 text-sm">
          <p className="text-slate-500">Active key source</p>
          <p className="font-semibold">{activeKeySource}</p>
        </div>

        <input
          type="password"
          value={adminKey}
          onChange={(e) => setAdminKey(e.target.value)}
          placeholder="Enter admin API key"
          className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm outline-none focus:border-slate-400"
        />

        <div className="flex flex-wrap gap-2">
          <Button onClick={saveKey}>Save Key</Button>
          <Button variant="outline" onClick={clearKey}>
            Clear Key
          </Button>
        </div>

        <p className="text-xs text-slate-500">Stored value: {adminKey ? MASK : "empty"}</p>
      </section>
    </div>
  );
}
