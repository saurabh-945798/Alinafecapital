import { useEffect, useState } from "react";
import { api } from "../../services/api";
import { FILE_BASE_URL } from "../../config/api";

export default function ProfileForm({ profile, onSaved, setError, setSuccess }) {
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [form, setForm] = useState({
    addressLine1: "",
    city: "",
    district: "",
    country: "Malawi",
    employmentType: "",
    monthlyIncome: "",
    bankName: "",
    accountNumber: "",
    branchCode: "",
  });

  useEffect(() => {
    if (!profile) return;
    setForm({
      addressLine1: profile.addressLine1 || "",
      city: profile.city || "",
      district: profile.district || "",
      country: profile.country || "Malawi",
      employmentType: profile.employmentType || "",
      monthlyIncome: profile.monthlyIncome || "",
      bankName: profile.bankName || "",
      accountNumber: profile.accountNumber || "",
      branchCode: profile.branchCode || "",
    });
  }, [profile]);

  const resolveAssetUrl = (path = "") => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${FILE_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      await api.put("/profile/me", {
        ...form,
        monthlyIncome: form.monthlyIncome === "" ? undefined : Number(form.monthlyIncome),
      });
      setSuccess("Profile updated");
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update profile");
    }
  };

  const uploadAvatar = async () => {
    setError("");
    setSuccess("");

    if (!avatarFile) {
      setError("Please choose an image file first.");
      return;
    }

    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(avatarFile.type)) {
      setError("Only JPG, PNG, or WEBP images are allowed.");
      return;
    }
    if (avatarFile.size > 2 * 1024 * 1024) {
      setError("Image must be less than 2MB.");
      return;
    }

    setAvatarUploading(true);
    try {
      const payload = new FormData();
      payload.append("file", avatarFile);
      await api.post("/profile/me/avatar", payload, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setAvatarFile(null);
      setSuccess("Profile photo updated.");
      onSaved();
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to upload profile photo.");
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <form id="profileForm" onSubmit={save} className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <h3 className="text-base font-semibold text-slate-800">Profile Photo (Optional)</h3>
        <p className="mt-1 text-sm text-slate-500">JPG, PNG or WEBP. Max size 2MB.</p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="h-20 w-20 overflow-hidden rounded-full border border-slate-300 bg-slate-100">
            {profile?.avatarUrl ? (
              <img
                src={resolveAssetUrl(profile.avatarUrl)}
                alt="Profile"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="grid h-full w-full place-items-center text-sm font-semibold text-slate-500">
                {String(profile?.fullName || "U")
                  .trim()
                  .charAt(0)
                  .toUpperCase() || "U"}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-2">
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setAvatarFile(e.target.files?.[0] || null)}
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={uploadAvatar}
              disabled={!avatarFile || avatarUploading}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
            >
              {avatarUploading ? "Uploading..." : "Upload Photo"}
            </button>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 md:p-5">
        <h2 className="text-lg font-semibold text-slate-800">Personal & Address Information</h2>
        <p className="mt-1 text-sm text-slate-500">
          Provide accurate details to improve your approval speed.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Address Line</span>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            placeholder="Area, street, or plot details"
            value={form.addressLine1}
            onChange={(e) => setForm((p) => ({ ...p, addressLine1: e.target.value }))}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">City / Town</span>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            placeholder="Example: Lilongwe"
            value={form.city}
            onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">District</span>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            placeholder="Example: Blantyre"
            value={form.district}
            onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))}
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Country</span>
          <input
            className="w-full rounded-xl border border-slate-300 bg-slate-100 px-3 py-2.5 text-sm text-slate-600 shadow-sm outline-none"
            value={form.country}
            readOnly
          />
        </label>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <h3 className="text-base font-semibold text-slate-800">Employment Details</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Employment Type</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Example: Government employee"
              value={form.employmentType}
              onChange={(e) => setForm((p) => ({ ...p, employmentType: e.target.value }))}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Monthly Income (MWK)</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Example: 350000"
              type="number"
              min="0"
              value={form.monthlyIncome}
              onChange={(e) => setForm((p) => ({ ...p, monthlyIncome: e.target.value }))}
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <h3 className="text-base font-semibold text-slate-800">Bank Details (For Disbursement)</h3>
        <p className="mt-1 text-sm text-slate-500">
          Add once here. We use these details when your loan is approved.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
          <label className="space-y-1.5 md:col-span-2">
            <span className="text-sm font-medium text-slate-700">Bank Name</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Example: National Bank of Malawi"
              value={form.bankName}
              onChange={(e) => setForm((p) => ({ ...p, bankName: e.target.value }))}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Account Number</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter account number"
              value={form.accountNumber}
              onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Branch Code</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter branch code"
              value={form.branchCode}
              onChange={(e) => setForm((p) => ({ ...p, branchCode: e.target.value }))}
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        Keep your profile details up to date. This helps us verify your account faster.
      </div>

      <button className="sr-only" type="submit">
        Save Profile
      </button>
    </form>
  );
}
