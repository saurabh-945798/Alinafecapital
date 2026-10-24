import { useEffect, useMemo, useState } from "react";
import { Check, Circle, Copy, Eye, EyeOff, RefreshCw, X } from "lucide-react";
import Button from "../ui/Button";
import { usersApi } from "../../services/api/users.api";
import { useToast } from "../../context/ToastContext.jsx";
import { formatAdminRole } from "../../utils/adminRbac.js";
import { generateStrongPassword, passwordChecks, passwordIsStrong } from "../../utils/passwordPolicy.js";

const ROLE_OPTIONS = [
  { value: "VERIFIER", label: "KYC VERIFIER", description: "Reviews and verifies customer KYC." },
  { value: "RISK_ANALYST", label: "RISK ANALYST", description: "Assesses security, surety and credit risk; cannot approve or disburse." },
  { value: "APPROVAL", label: "APPROVER", description: "Approves applications after KYC and Risk Review." },
  { value: "AUTHORIZED", label: "AUTHORIZER", description: "Authorizes approved loans for disbursement." },
  { value: "DISBURSED", label: "DISBURSER", description: "Completes authorized disbursements and loan-account operations." },
  { value: "PAYMENT_VERIFIER", label: "PAYMENT VERIFIER", description: "Verifies bank POPs and repayment evidence." },
  { value: "AUDITOR", label: "AUDITOR", description: "Read-only review of risk, payments, journal and audit records." },
  { value: "SUPER_ADMIN", label: "SUPER ADMIN", description: "System administration, user access and controlled operational oversight." },
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

const defaultForm = { fullName: "", email: "", phone: "", password: "", role: "VERIFIER" };

function PasswordChecklist({ checks }) {
  return (
    <div className="mt-2 grid gap-1.5 sm:grid-cols-2 lg:grid-cols-4">
      {Object.entries(CHECK_LABELS).map(([key, label]) => (
        <span key={key} className={`flex items-center gap-1.5 text-[11px] ${checks[key] ? "text-emerald-700" : "text-slate-500"}`}>
          {checks[key] ? <Check size={12} /> : <Circle size={10} />} {label}
        </span>
      ))}
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

  const [resetTarget, setResetTarget] = useState(null);
  const [resetValue, setResetValue] = useState("");
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetSaving, setResetSaving] = useState(false);

  const checks = useMemo(
    () => passwordChecks(form.password, { fullName: form.fullName, email: form.email }),
    [form.password, form.fullName, form.email]
  );
  const strong = useMemo(
    () => passwordIsStrong(form.password, { fullName: form.fullName, email: form.email }),
    [form.password, form.fullName, form.email]
  );
  const canCreate = useMemo(
    () => Boolean(form.fullName.trim() && form.email.trim() && form.phone.trim() && strong && form.role),
    [form, strong]
  );

  const resetChecks = useMemo(
    () => passwordChecks(resetValue, { fullName: resetTarget?.fullName, email: resetTarget?.email }),
    [resetValue, resetTarget]
  );
  const resetStrong = useMemo(
    () => passwordIsStrong(resetValue, { fullName: resetTarget?.fullName, email: resetTarget?.email }),
    [resetValue, resetTarget]
  );

  const loadUsers = async () => {
    setLoading(true);
    setError("");
    try {
      const data = await usersApi.list();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to load admin users.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

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
      });
      setForm(defaultForm);
      setCopyNotice("");
      toast.success("Staff user created.");
      await loadUsers();
    } catch (err) {
      const details = err?.response?.data?.details;
      const msg =
        (Array.isArray(details) && details.length ? details.join(" ") : "") ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create user.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const updateRole = async (id, role) => {
    try {
      await usersApi.update(id, { role });
      toast.success("Role updated. The user's active server session has been revoked; they must sign in again.");
      await loadUsers();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update role.");
    }
  };

  const toggleActive = async (id, isActive) => {
    try {
      await usersApi.update(id, { isActive: !isActive });
      toast.success(!isActive ? "User activated." : "User deactivated and active session revoked.");
      await loadUsers();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to update active status.");
    }
  };

  const openResetPassword = (user) => {
    setResetTarget(user);
    setResetValue("");
    setShowResetPassword(false);
  };

  const closeResetPassword = () => {
    if (resetSaving) return;
    setResetTarget(null);
    setResetValue("");
    setShowResetPassword(false);
  };

  const submitResetPassword = async (event) => {
    event.preventDefault();
    if (!resetTarget || !resetStrong || resetSaving) return;
    setResetSaving(true);
    try {
      await usersApi.resetPassword(resetTarget._id || resetTarget.id, resetValue);
      toast.success("Password reset successfully. The user must sign in again with the new password.");
      closeResetPassword();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to reset password.");
    } finally {
      setResetSaving(false);
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
        <p className="text-sm text-slate-500">Create and maintain role-based staff access for KYC, Risk, approvals, authorization, disbursement, payment verification and audit.</p>
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold">Create Staff User</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-4">
          {ROLE_OPTIONS.map((role) => (
            <div key={role.value} className="rounded-xl border bg-slate-50 px-3 py-2">
              <p className="text-xs font-bold">{role.label}</p>
              <p className="mt-1 text-[11px] leading-4 text-slate-500">{role.description}</p>
            </div>
          ))}
        </div>

        <form onSubmit={createUser} className="mt-4 grid gap-3 md:grid-cols-3">
          <input className="h-10 rounded-lg border px-3 text-sm" placeholder="Full name" value={form.fullName} onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))} />
          <input className="h-10 rounded-lg border px-3 text-sm" placeholder="Email" value={form.email} onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))} />
          <input className="h-10 rounded-lg border px-3 text-sm" placeholder="Phone" value={form.phone} onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))} />
          <div className="relative">
            <input className="h-10 w-full rounded-lg border px-3 pr-10 text-sm" placeholder="Strong password" type={showPassword ? "text" : "password"} value={form.password} onChange={(e) => { setForm((prev) => ({ ...prev, password: e.target.value })); setCopyNotice(""); }} autoComplete="new-password" />
            <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-2 top-2 p-1 text-slate-500" aria-label={showPassword ? "Hide password" : "Show password"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
          </div>
          <select className="h-10 rounded-lg border px-3 text-sm" value={form.role} onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}>
            {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
          <Button type="submit" disabled={!canCreate || saving}>{saving ? "Creating..." : "Create User"}</Button>

          <div className="md:col-span-3 rounded-xl border bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold">Password requirements</p>
              <div className="flex gap-2">
                <button type="button" onClick={suggest} className="inline-flex items-center gap-1 rounded-lg border bg-white px-2 py-1.5 text-xs font-semibold"><RefreshCw size={12} />Suggest</button>
                <button type="button" onClick={copy} disabled={!form.password} className="inline-flex items-center gap-1 rounded-lg border bg-white px-2 py-1.5 text-xs font-semibold disabled:opacity-50"><Copy size={12} />Copy</button>
              </div>
            </div>
            <PasswordChecklist checks={checks} />
            {copyNotice ? <p className="mt-2 text-xs text-blue-700">{copyNotice}</p> : null}
          </div>
        </form>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold">Existing Admin Users</h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading users...</p>
        ) : items.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No admin users found.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500"><tr><th className="px-2 py-2">Name</th><th className="px-2 py-2">Email</th><th className="px-2 py-2">Phone</th><th className="px-2 py-2">Role</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Actions</th></tr></thead>
              <tbody>
                {items.map((user) => (
                  <tr key={user._id || user.id} className="border-t">
                    <td className="px-2 py-2">{user.fullName || "-"}</td>
                    <td className="px-2 py-2">{user.email || "-"}</td>
                    <td className="px-2 py-2">{user.phone || "-"}</td>
                    <td className="px-2 py-2">
                      <select className="h-9 rounded-lg border px-2 text-sm" value={user.role || "VERIFIER"} onChange={(e) => updateRole(user._id || user.id, e.target.value)}>
                        {ROLE_OPTIONS.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                      </select>
                      <div className="mt-1 text-[11px] text-slate-500">{formatAdminRole(user.role)}</div>
                    </td>
                    <td className="px-2 py-2"><span className={`rounded-full px-2 py-1 text-xs font-semibold ${user.isActive !== false ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{user.isActive !== false ? "Active" : "Inactive"}</span></td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => toggleActive(user._id || user.id, user.isActive !== false)}>{user.isActive !== false ? "Deactivate" : "Activate"}</Button>
                        <Button size="sm" variant="outline" onClick={() => openResetPassword(user)}>Reset Password</Button>
                        <Button size="sm" variant="danger" onClick={() => removeUser(user._id || user.id, user.fullName)}>Delete</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {resetTarget ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="reset-password-title">
          <form onSubmit={submitResetPassword} className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="reset-password-title" className="text-lg font-bold">Reset staff password</h2>
                <p className="mt-1 text-sm text-slate-500">{resetTarget.fullName || resetTarget.email}. The stored password is never displayed; enter a new temporary password below.</p>
              </div>
              <button type="button" onClick={closeResetPassword} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100" aria-label="Close"><X size={18} /></button>
            </div>
            <div className="relative mt-4">
              <input className="h-11 w-full rounded-xl border px-3 pr-11 text-sm" type={showResetPassword ? "text" : "password"} value={resetValue} onChange={(e) => setResetValue(e.target.value)} placeholder="New strong password" autoComplete="new-password" autoFocus />
              <button type="button" onClick={() => setShowResetPassword((value) => !value)} className="absolute right-2 top-2.5 p-1 text-slate-500" aria-label={showResetPassword ? "Hide password" : "Show password"}>{showResetPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button>
            </div>
            <PasswordChecklist checks={resetChecks} />
            <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">After reset, the staff member must sign in with the new password. Existing refresh sessions should remain revoked by the backend reset action.</p>
            <div className="mt-5 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={closeResetPassword} disabled={resetSaving}>Cancel</Button>
              <Button type="submit" disabled={!resetStrong || resetSaving}>{resetSaving ? "Resetting..." : "Reset Password"}</Button>
            </div>
          </form>
        </div>
      ) : null}
    </div>
  );
}
