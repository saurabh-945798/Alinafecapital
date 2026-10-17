import { useEffect, useMemo, useState } from "react";
import { Check, Circle, Copy, Eye, EyeOff, RefreshCw } from "lucide-react";
import Button from "../ui/Button";
import { usersApi } from "../../services/api/users.api";
import { useToast } from "../../context/ToastContext.jsx";
import { formatAdminRole, normalizeAdminRoles } from "../../utils/adminRbac.js";
import { generateStrongPassword, passwordChecks, passwordIsStrong } from "../../utils/passwordPolicy.js";

const ROLE_OPTIONS = [
  { value: "SUPER_ADMIN", label: "SUPER ADMIN", description: "Manages staff access, system controls and full authorised oversight." },
  { value: "VERIFIER", label: "KYC VERIFIER", description: "Reviews and verifies customer KYC only." },
  { value: "LOAN_OPERATIONS", label: "LOAN OPERATIONS", description: "Processes applications and workflow completeness without credit approval." },
  { value: "RISK_ANALYST", label: "RISK ANALYST", description: "Assesses security, surety and credit risk; cannot approve or disburse." },
  { value: "APPROVAL", label: "CREDIT APPROVER", description: "Approves or declines eligible applications after KYC and Risk Review." },
  { value: "AUTHORIZED", label: "CREDIT AUTHORIZER", description: "Performs second-level authorization after approval." },
  { value: "DISBURSED", label: "DISBURSEMENT OFFICER", description: "Completes authorised disbursements and views loan accounts." },
  { value: "PAYMENT_VERIFIER", label: "PAYMENT VERIFICATION", description: "Verifies Bank POPs and repayment evidence; cannot approve loans." },
  { value: "FINANCE_RECON", label: "FINANCE & RECONCILIATION", description: "Reconciles repayments and financial journal records; no credit approval." },
  { value: "COLLECTIONS", label: "COLLECTIONS & RECOVERIES", description: "Monitors overdue accounts and repayment follow-up only." },
  { value: "CUSTOMER_SERVICE", label: "CUSTOMER SERVICE", description: "Handles customer queries and complaints with limited customer visibility." },
  { value: "REPORTING_MIS", label: "REPORTING & MIS", description: "Read-only management reports and analytics." },
  { value: "AUDITOR", label: "AUDITOR / COMPLIANCE", description: "Independent read-only review. Must not be combined with operational roles." },
  { value: "TECH_SUPPORT", label: "TECHNICAL SUPPORT", description: "Technical settings and support only; no lending or payment decisions." },
];

const CHECK_LABELS = {
  length: "12+ characters",
  upper: "Uppercase letter",
  lower: "Lowercase letter",
  number: "Number",
  special: "Special character",
  identity: "Does not contain name/email",
  common: "Not a common password",
};

const defaultForm = { fullName: "", email: "", phone: "", password: "", roles: ["VERIFIER"] };

const roleConflict = (roles = []) => {
  const normalized = normalizeAdminRoles(roles);
  if (!normalized.includes("AUDITOR")) return "";
  const operational = normalized.filter((role) => !["AUDITOR", "REPORTING_MIS"].includes(role));
  return operational.length
    ? "Auditor access must remain independent and cannot be combined with operational roles."
    : "";
};

function RoleChecklist({ value = [], onChange, compact = false }) {
  const selected = new Set(normalizeAdminRoles(value));
  const toggle = (role) => {
    const next = new Set(selected);
    if (next.has(role)) next.delete(role);
    else next.add(role);
    onChange(Array.from(next));
  };

  return (
    <div className={compact ? "grid gap-1.5 md:grid-cols-2" : "grid gap-2 md:grid-cols-2 xl:grid-cols-3"}>
      {ROLE_OPTIONS.map((role) => {
        const checked = selected.has(role.value);
        return (
          <label key={role.value} className={`flex cursor-pointer gap-2 rounded-xl border px-3 py-2 ${checked ? "border-slate-900 bg-slate-50" : "bg-white"}`}>
            <input type="checkbox" checked={checked} onChange={() => toggle(role.value)} className="mt-0.5" />
            <span>
              <span className="block text-xs font-bold text-slate-900">{role.label}</span>
              {!compact ? <span className="mt-1 block text-[11px] leading-4 text-slate-500">{role.description}</span> : null}
            </span>
          </label>
        );
      })}
    </div>
  );
}

export default function UserAccessPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
  const [draftRoles, setDraftRoles] = useState({});

  const checks = useMemo(() => passwordChecks(form.password, { fullName: form.fullName, email: form.email }), [form.password, form.fullName, form.email]);
  const strong = useMemo(() => passwordIsStrong(form.password, { fullName: form.fullName, email: form.email }), [form.password, form.fullName, form.email]);
  const formRoleConflict = useMemo(() => roleConflict(form.roles), [form.roles]);
  const canCreate = useMemo(
    () => Boolean(form.fullName.trim() && form.email.trim() && form.phone.trim() && strong && form.roles.length && !formRoleConflict),
    [form, strong, formRoleConflict]
  );

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await usersApi.list();
      const rows = Array.isArray(data) ? data : [];
      setItems(rows);
      setDraftRoles(Object.fromEntries(rows.map((user) => [user._id || user.id, normalizeAdminRoles(user)])));
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load admin users.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadUsers(); }, []);

  const suggest = () => {
    const next = generateStrongPassword();
    setForm((prev) => ({ ...prev, password: next }));
    setShowPassword(true);
    setCopyNotice("Strong password suggested. Save it securely before creating the user.");
  };

  const copy = async () => {
    if (!form.password) return;
    try {
      await navigator.clipboard.writeText(form.password);
      setCopyNotice("Password copied.");
    } catch {
      setCopyNotice("Copy was blocked. Select the password and copy it manually.");
    }
  };

  const createUser = async (event) => {
    event.preventDefault();
    if (!canCreate || saving) return;
    setSaving(true);
    setError("");
    try {
      await usersApi.create({
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        roles: normalizeAdminRoles(form.roles),
      });
      setForm(defaultForm);
      setCopyNotice("");
      toast.success("Staff user created with limited role access.");
      await loadUsers();
    } catch (err) {
      const details = err?.response?.data?.details;
      const msg = (Array.isArray(details) && details.length ? details.map((item) => item?.message || item).join(" ") : "") || err?.response?.data?.message || err?.message || "Failed to create user.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const saveRoles = async (id) => {
    const roles = normalizeAdminRoles(draftRoles[id] || []);
    const conflict = roleConflict(roles);
    if (!roles.length) return toast.error("Select at least one role.");
    if (conflict) return toast.error(conflict);
    try {
      await usersApi.update(id, { roles });
      toast.success("Access roles updated. The user must sign in again for changes to take effect.");
      await loadUsers();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update roles.");
    }
  };

  const toggleActive = async (id, isActive) => {
    try {
      await usersApi.update(id, { isActive: !isActive });
      toast.success(!isActive ? "User activated." : "User deactivated.");
      await loadUsers();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update active status.");
    }
  };

  const resetPassword = async (id, user) => {
    const next = window.prompt(`Enter a new strong password for ${user?.fullName || "this user"}. It must meet the 12-character password policy:`);
    if (!next) return;
    if (!passwordIsStrong(next, { fullName: user?.fullName, email: user?.email })) {
      toast.error("That password does not meet the required password policy.");
      return;
    }
    try {
      await usersApi.resetPassword(id, next);
      toast.success("Password reset successfully.");
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to reset password.");
    }
  };

  const removeUser = async (id, fullName) => {
    if (!window.confirm(`Delete user "${fullName || "this user"}"? This action cannot be undone.`)) return;
    try {
      await usersApi.remove(id);
      toast.success("User deleted successfully.");
      await loadUsers();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to delete user.");
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">User Access</h1>
        <p className="text-sm text-slate-500">Assign only the job roles each staff member needs. Users can hold multiple limited roles where duties genuinely overlap.</p>
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold">Create Staff User</h2>
        <form onSubmit={createUser} className="mt-4 grid gap-3 md:grid-cols-3">
          <input className="h-10 rounded-lg border px-3 text-sm" placeholder="Full name" value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
          <input className="h-10 rounded-lg border px-3 text-sm" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <input className="h-10 rounded-lg border px-3 text-sm" placeholder="Phone" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
          <div className="relative">
            <input className="h-10 w-full rounded-lg border px-3 pr-10 text-sm" placeholder="Strong password" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => { setForm((p) => ({ ...p, password: e.target.value })); setCopyNotice(""); }} autoComplete="new-password" />
            <button type="button" onClick={() => setShowPassword((v) => !v)} className="absolute right-2 top-2 p-1 text-slate-500">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </div>
          <div className="md:col-span-2 flex items-center gap-2"><Button type="submit" disabled={!canCreate || saving}>{saving ? "Creating..." : "Create User"}</Button><span className="text-xs text-slate-500">Role changes revoke the old session and require a new sign-in.</span></div>

          <div className="md:col-span-3 rounded-xl border bg-slate-50 p-3">
            <p className="mb-2 text-xs font-bold">Select job roles</p>
            <RoleChecklist value={form.roles} onChange={(roles) => setForm((p) => ({ ...p, roles }))} />
            {formRoleConflict ? <p className="mt-2 text-xs font-semibold text-rose-700">{formRoleConflict}</p> : null}
          </div>

          <div className="md:col-span-3 rounded-xl border bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold">Password requirements</p>
              <div className="flex gap-2">
                <button type="button" onClick={suggest} className="inline-flex items-center gap-1 rounded-lg border bg-white px-2 py-1.5 text-xs font-semibold"><RefreshCw size={12} />Suggest</button>
                <button type="button" onClick={copy} disabled={!form.password} className="inline-flex items-center gap-1 rounded-lg border bg-white px-2 py-1.5 text-xs font-semibold disabled:opacity-50"><Copy size={12} />Copy</button>
              </div>
            </div>
            <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
              {Object.entries(CHECK_LABELS).map(([key, label]) => <span key={key} className={`flex items-center gap-1.5 text-[11px] ${checks[key] ? "text-emerald-700" : "text-slate-500"}`}>{checks[key] ? <Check size={12} /> : <Circle size={10} />} {label}</span>)}
            </div>
            {copyNotice ? <p className="mt-2 text-xs text-blue-700">{copyNotice}</p> : null}
          </div>
        </form>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold">Existing Admin Users</h2>
        {loading ? <p className="mt-3 text-sm text-slate-500">Loading users...</p> : items.length === 0 ? <p className="mt-3 text-sm text-slate-500">No admin users found.</p> : (
          <div className="mt-3 space-y-3">
            {items.map((user) => {
              const id = user._id || user.id;
              const roles = draftRoles[id] || normalizeAdminRoles(user);
              const conflict = roleConflict(roles);
              return (
                <div key={id} className="rounded-2xl border p-4">
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="font-bold text-slate-900">{user.fullName || "-"}</p>
                      <p className="text-xs text-slate-500">{user.email || "-"} · {user.phone || "-"}</p>
                      <div className="mt-2 flex flex-wrap gap-1.5">{normalizeAdminRoles(user).map((role) => <span key={role} className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-semibold text-slate-700">{formatAdminRole(role)}</span>)}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.isActive !== false ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{user.isActive !== false ? "Active" : "Inactive"}</span>
                      <Button size="sm" variant="outline" onClick={() => toggleActive(id, user.isActive !== false)}>{user.isActive !== false ? "Deactivate" : "Activate"}</Button>
                      <Button size="sm" variant="outline" onClick={() => resetPassword(id, user)}>Reset Password</Button>
                      <Button size="sm" variant="danger" onClick={() => removeUser(id, user.fullName)}>Delete</Button>
                    </div>
                  </div>
                  <details className="mt-3 rounded-xl bg-slate-50 p-3">
                    <summary className="cursor-pointer text-xs font-bold text-slate-700">Edit limited access roles</summary>
                    <div className="mt-3"><RoleChecklist compact value={roles} onChange={(next) => setDraftRoles((prev) => ({ ...prev, [id]: next }))} /></div>
                    {conflict ? <p className="mt-2 text-xs font-semibold text-rose-700">{conflict}</p> : null}
                    <Button className="mt-3" size="sm" disabled={!roles.length || Boolean(conflict)} onClick={() => saveRoles(id)}>Save Roles</Button>
                  </details>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
