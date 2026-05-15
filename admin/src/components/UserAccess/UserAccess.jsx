import { useEffect, useMemo, useState } from "react";
import Button from "../ui/Button";
import { usersApi } from "../../services/api/users.api";
import { useToast } from "../../context/ToastContext.jsx";

const ROLE_OPTIONS = ["SUPER_ADMIN", "VERIFIER", "APPROVAL", "AUTHORIZED", "DISBURSED"];

const defaultForm = {
  fullName: "",
  email: "",
  phone: "",
  password: "",
  role: "VERIFIER",
};

export default function UserAccessPage() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [error, setError] = useState("");

  const canCreate = useMemo(
    () =>
      String(form.fullName || "").trim() &&
      String(form.email || "").trim() &&
      String(form.phone || "").trim() &&
      String(form.password || "").trim() &&
      String(form.role || "").trim(),
    [form]
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

  const createUser = async (e) => {
    e.preventDefault();
    if (!canCreate || saving) return;
    setSaving(true);
    setError("");
    try {
      await usersApi.create({
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        password: form.password,
        role: form.role,
      });
      setForm(defaultForm);
      toast.success("Admin user created.");
      await loadUsers();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to create user.";
      setError(msg);
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const updateRole = async (id, role) => {
    try {
      await usersApi.update(id, { role });
      toast.success("Role updated.");
      await loadUsers();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to update role.";
      toast.error(msg);
    }
  };

  const toggleActive = async (id, isActive) => {
    try {
      await usersApi.update(id, { isActive: !isActive });
      toast.success(!isActive ? "User activated." : "User deactivated.");
      await loadUsers();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to update active status.";
      toast.error(msg);
    }
  };

  const resetPassword = async (id) => {
    const next = window.prompt("Enter new password (min 6 characters):", "Admin@123");
    if (!next) return;
    try {
      await usersApi.resetPassword(id, next);
      toast.success("Password reset successfully.");
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to reset password.";
      toast.error(msg);
    }
  };

  const removeUser = async (id, fullName) => {
    const ok = window.confirm(`Delete user "${fullName || "this user"}"? This action cannot be undone.`);
    if (!ok) return;
    try {
      await usersApi.remove(id);
      toast.success("User deleted successfully.");
      await loadUsers();
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "Failed to delete user.";
      toast.error(msg);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">User Access</h1>
        <p className="text-sm text-slate-500">Create and manage worker roles: verifier, approval, authorized, and disbursed.</p>
      </div>

      {error ? <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Create Admin User</h2>
        <form onSubmit={createUser} className="mt-3 grid gap-3 md:grid-cols-3">
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="Full name"
            value={form.fullName}
            onChange={(e) => setForm((prev) => ({ ...prev, fullName: e.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm((prev) => ({ ...prev, phone: e.target.value }))}
          />
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="Password"
            type="password"
            value={form.password}
            onChange={(e) => setForm((prev) => ({ ...prev, password: e.target.value }))}
          />
          <select
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            value={form.role}
            onChange={(e) => setForm((prev) => ({ ...prev, role: e.target.value }))}
          >
            {ROLE_OPTIONS.map((role) => (
              <option key={role} value={role}>
                {role}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={!canCreate || saving}>
            {saving ? "Creating..." : "Create User"}
          </Button>
        </form>
      </section>

      <section className="rounded-xl border bg-white p-4">
        <h2 className="text-sm font-semibold text-slate-900">Existing Admin Users</h2>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Loading users...</p>
        ) : items.length === 0 ? (
          <p className="mt-3 text-sm text-slate-500">No admin users found.</p>
        ) : (
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="text-left text-slate-500">
                <tr>
                  <th className="px-2 py-2">Name</th>
                  <th className="px-2 py-2">Email</th>
                  <th className="px-2 py-2">Phone</th>
                  <th className="px-2 py-2">Role</th>
                  <th className="px-2 py-2">Status</th>
                  <th className="px-2 py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((user) => (
                  <tr key={user._id || user.id} className="border-t">
                    <td className="px-2 py-2">{user.fullName || "-"}</td>
                    <td className="px-2 py-2">{user.email || "-"}</td>
                    <td className="px-2 py-2">{user.phone || "-"}</td>
                    <td className="px-2 py-2">
                      <select
                        className="h-9 rounded-lg border border-slate-200 px-2 text-sm"
                        value={user.role || "VERIFIER"}
                        onChange={(e) => updateRole(user._id || user.id, e.target.value)}
                      >
                        {ROLE_OPTIONS.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <span
                        className={[
                          "rounded-full px-2 py-1 text-xs font-semibold",
                          user.isActive ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700",
                        ].join(" ")}
                      >
                        {user.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => toggleActive(user._id || user.id, user.isActive)}>
                          {user.isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => resetPassword(user._id || user.id)}>
                          Reset Password
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          onClick={() => removeUser(user._id || user.id, user.fullName)}
                        >
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
