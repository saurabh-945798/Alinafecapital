import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, FileSpreadsheet, LockKeyhole, RefreshCcw, ShieldCheck, SlidersHorizontal, Users } from "lucide-react";
import Button from "../ui/Button";
import { clearAdminSession, getAdminUser } from "../../utils/adminAuth";

const STORAGE_KEY = "alinafe_admin_settings";

const defaultSettings = {
  autoRefreshReports: true,
  autoRefreshSeconds: 30,
  requireSeparateDisburser: true,
  showPaymentAlerts: true,
  exportChartsWithReports: true,
  maskCustomerContacts: false,
};

function Toggle({ label, description, checked, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-left transition hover:border-slate-300 hover:bg-slate-50"
    >
      <span>
        <span className="block text-sm font-bold text-slate-900">{label}</span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">{description}</span>
      </span>
      <span className={["relative inline-flex h-7 w-12 shrink-0 rounded-full transition", checked ? "bg-slate-900" : "bg-slate-200"].join(" ")}>
        <span className={["absolute top-1 h-5 w-5 rounded-full bg-white shadow transition", checked ? "left-6" : "left-1"].join(" ")} />
      </span>
    </button>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const adminUser = useMemo(() => getAdminUser(), []);
  const [settings, setSettings] = useState(defaultSettings);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setSettings({ ...defaultSettings, ...JSON.parse(raw) });
    } catch {
      setSettings(defaultSettings);
    }
  }, []);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const saveSettings = () => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const resetSettings = () => {
    setSettings(defaultSettings);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultSettings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  const logout = () => {
    clearAdminSession();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">System Preferences</p>
          <h1 className="mt-1 text-2xl font-bold">Settings</h1>
          <p className="text-sm text-slate-500">Control admin experience, security reminders and reporting behavior.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={resetSettings}>Reset defaults</Button>
          <Button onClick={saveSettings}>{saved ? "Saved" : "Save settings"}</Button>
        </div>
      </div>

      <section className="grid gap-4 xl:grid-cols-[1fr_1.5fr]">
        <div className="rounded-2xl border bg-white p-4 space-y-3">
          <div className="flex items-center gap-3 rounded-2xl bg-slate-50 p-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
              <Users size={18} />
            </div>
            <div>
              <p className="text-xs text-slate-500">Logged in as</p>
              <p className="font-semibold text-slate-900">{adminUser?.fullName || "Admin"}</p>
              <p className="text-xs text-slate-500">{adminUser?.email || "-"}</p>
            </div>
          </div>
          <Button variant="outline" onClick={logout}>Logout</Button>
        </div>

        <div className="rounded-2xl border bg-white p-4">
          <div className="mb-3 flex items-center gap-2">
            <SlidersHorizontal size={18} className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-900">Operational controls</h2>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <Toggle
              label="Live report refresh"
              description="Keep reports and analytics refreshing automatically while the page is open."
              checked={settings.autoRefreshReports}
              onChange={(value) => updateSetting("autoRefreshReports", value)}
            />
            <Toggle
              label="Payment alerts"
              description="Highlight recent card and Airtel Money repayments for easier reconciliation follow-up."
              checked={settings.showPaymentAlerts}
              onChange={(value) => updateSetting("showPaymentAlerts", value)}
            />
            <Toggle
              label="Separate disbursement user"
              description="Recommended: approval and disbursement should be handled by different staff roles."
              checked={settings.requireSeparateDisburser}
              onChange={(value) => updateSetting("requireSeparateDisburser", value)}
            />
            <Toggle
              label="Excel chart data"
              description="Include chart source data when exporting reconciliation reports."
              checked={settings.exportChartsWithReports}
              onChange={(value) => updateSetting("exportChartsWithReports", value)}
            />
            <Toggle
              label="Mask customer contacts"
              description="Hide parts of phone numbers and emails when viewing shared admin screens."
              checked={settings.maskCustomerContacts}
              onChange={(value) => updateSetting("maskCustomerContacts", value)}
            />
            <label className="rounded-2xl border border-slate-200 bg-white px-4 py-3">
              <span className="block text-sm font-bold text-slate-900">Refresh interval</span>
              <span className="mt-1 block text-xs leading-5 text-slate-500">Used by reports and analytics where auto-refresh is enabled.</span>
              <select
                value={settings.autoRefreshSeconds}
                onChange={(event) => updateSetting("autoRefreshSeconds", Number(event.target.value))}
                className="mt-3 h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
              >
                <option value={15}>15 seconds</option>
                <option value={30}>30 seconds</option>
                <option value={60}>60 seconds</option>
                <option value={120}>2 minutes</option>
              </select>
            </label>
          </div>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {[
          { icon: ShieldCheck, title: "Access control", copy: "Only Super Admin can create staff accounts and reset passwords.", action: "Manage users", to: "/admin/user-access" },
          { icon: FileSpreadsheet, title: "Reconciliation", copy: "Export CSV/Excel reports and print summaries for monthly review.", action: "Open reports", to: "/admin/reports" },
          { icon: RefreshCcw, title: "Live operations", copy: "Reports and dashboard metrics refresh automatically during active sessions.", action: "Open dashboard", to: "/admin" },
          { icon: LockKeyhole, title: "Security checklist", copy: "Rotate live API keys, restrict CORS domains and use individual staff accounts.", action: "View guide", to: null },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-2xl border bg-white p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-950 text-white">
                <Icon size={18} />
              </div>
              <p className="mt-3 text-sm font-bold text-slate-900">{item.title}</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">{item.copy}</p>
              <Button size="sm" variant="outline" className="mt-3" onClick={() => item.to && navigate(item.to)}>
                {item.action}
              </Button>
            </div>
          );
        })}
      </section>

      <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm leading-6 text-amber-800">
        Settings on this page are admin-console preferences. Production security still requires server-side controls: strong passwords, HTTPS, restricted CORS origins, rotated API keys and individual staff accounts.
      </div>
    </div>
  );
}
