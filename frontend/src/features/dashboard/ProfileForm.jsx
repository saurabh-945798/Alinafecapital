import { useEffect, useRef, useState } from "react";
import { api } from "../../services/api";
import { FILE_BASE_URL } from "../../config/api";

const BANK_OPTIONS = [
  "CDH Investment Bank (Limited)",
  "Centenary Bank Malawi",
  "Ecobank Malawi Limited",
  "FDH Bank Plc",
  "First Capital Bank Plc (Malawi)",
  "National Bank of Malawi Plc",
  "NBS Bank Plc",
  "Standard Bank Malawi Plc",
  "Nedbank (Malawi) Limited",
  "Opportunity International Bank Malawi (OIBM)",
  "New Finance Bank Malawi Limited",
  "Reserve Bank of Malawi (Central Bank)",
  "Malawi Savings Bank",
  "Indebank",
];

export default function ProfileForm({
  profile,
  onSaved,
  onAvatarSaved,
  setError,
  setSuccess,
  onEmploymentTypeChange,
  documentsComplete = false,
  onCompletionChange,
  apiBasePath = "/profile/me",
  submitUrl = "/profile/me/submit",
  avatarUrl = "/profile/me/avatar",
}) {
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [showCongratsModal, setShowCongratsModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const prevCompletionRef = useRef(Number(profile?.profileCompletion || 0));
  const [form, setForm] = useState({
    addressLine1: "",
    city: "",
    district: "",
    country: "Malawi",
    employmentType: "",
    governmentId: "",
    monthlyIncome: "",
    bankNameOption: "",
    bankNameOther: "",
    accountNumber: "",
    branchCode: "",
    reference1Name: "",
    reference1Phone: "",
    reference2Name: "",
    reference2Phone: "",
  });

  useEffect(() => {
    if (!profile) return;
    const existingBankName = String(profile.bankName || "").trim();
    const isKnownBank = BANK_OPTIONS.includes(existingBankName);

    setForm({
      addressLine1: profile.addressLine1 || "",
      city: profile.city || "",
      district: profile.district || "",
      country: profile.country || "Malawi",
      employmentType: profile.employmentType || "",
      governmentId: profile.governmentId || "",
      monthlyIncome: profile.monthlyIncome || "",
      bankNameOption: isKnownBank ? existingBankName : existingBankName ? "Other" : "",
      bankNameOther: isKnownBank ? "" : existingBankName,
      accountNumber: profile.accountNumber || "",
      branchCode: profile.branchCode || "",
      reference1Name: profile.reference1Name || "",
      reference1Phone: profile.reference1Phone || "",
      reference2Name: profile.reference2Name || "",
      reference2Phone: profile.reference2Phone || "",
    });
    onEmploymentTypeChange?.(profile.employmentType || "");
  }, [profile, onEmploymentTypeChange]);

  useEffect(() => {
    const previous = Number(prevCompletionRef.current || 0);
    const current = Number(profile?.profileCompletion || 0);
    if (previous < 100 && current === 100) {
      setShowCongratsModal(true);
    }
    prevCompletionRef.current = current;
  }, [profile?.profileCompletion]);

  useEffect(() => {
    const resolvedBankName =
      form.bankNameOption === "Other"
        ? String(form.bankNameOther || "").trim()
        : String(form.bankNameOption || "").trim();
    const isGovernmentEmployee =
      String(form.employmentType || "").trim().toLowerCase() === "government employee";
    const hasAvatar = !!String(profile?.avatarUrl || "").trim();

    const sectionsComplete =
      hasAvatar &&
      !!String(form.addressLine1 || "").trim() &&
      !!String(form.city || "").trim() &&
      !!String(form.district || "").trim() &&
      !!String(form.employmentType || "").trim() &&
      (!isGovernmentEmployee || !!String(form.governmentId || "").trim()) &&
      !!String(form.monthlyIncome || "").trim() &&
      Number(form.monthlyIncome) > 0 &&
      !!resolvedBankName &&
      (form.bankNameOption !== "Other" || !!String(form.bankNameOther || "").trim()) &&
      !!String(form.accountNumber || "").trim() &&
      !!String(form.branchCode || "").trim() &&
      !!String(form.reference1Name || "").trim() &&
      !!String(form.reference1Phone || "").trim() &&
      !!String(form.reference2Name || "").trim() &&
      !!String(form.reference2Phone || "").trim();

    onCompletionChange?.(sectionsComplete);
  }, [form, onCompletionChange, profile?.avatarUrl]);

  const resolveAssetUrl = (path = "") => {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `${FILE_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  };

  const validateForm = () => {
    const resolvedBankName =
      form.bankNameOption === "Other"
        ? String(form.bankNameOther || "").trim()
        : String(form.bankNameOption || "").trim();
    const isGovernmentEmployee =
      String(form.employmentType || "").trim().toLowerCase() === "government employee";

    if (!String(profile?.avatarUrl || "").trim()) return "Please upload your profile photo.";
    if (!String(form.addressLine1 || "").trim()) return "Please enter your address line.";
    if (!String(form.city || "").trim()) return "Please enter your city or town.";
    if (!String(form.district || "").trim()) return "Please enter your district.";
    if (!String(form.employmentType || "").trim()) return "Please select your employment type.";
    if (isGovernmentEmployee && !String(form.governmentId || "").trim()) {
      return "Please enter your government ID.";
    }
    if (!String(form.monthlyIncome || "").trim()) return "Please enter your monthly income.";
    if (Number(form.monthlyIncome) <= 0) return "Monthly income must be greater than zero.";
    if (!resolvedBankName) return "Please select your bank name.";
    if (form.bankNameOption === "Other" && !String(form.bankNameOther || "").trim()) {
      return "Please enter your bank name.";
    }
    if (!String(form.accountNumber || "").trim()) return "Please enter your account number.";
    if (!String(form.branchCode || "").trim()) return "Please enter your branch.";
    if (!String(form.reference1Name || "").trim()) return "Please enter reference 1 name.";
    if (!String(form.reference1Phone || "").trim()) return "Please enter reference 1 phone number.";
    if (!String(form.reference2Name || "").trim()) return "Please enter reference 2 name.";
    if (!String(form.reference2Phone || "").trim()) return "Please enter reference 2 phone number.";

    return "";
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const resolvedBankName =
      form.bankNameOption === "Other"
        ? String(form.bankNameOther || "").trim()
        : form.bankNameOption;

    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    if (!documentsComplete) {
      setError("Please upload all required KYC documents before submitting.");
      return;
    }

    try {
      const response = await api.put(apiBasePath, {
        addressLine1: form.addressLine1,
        city: form.city,
        district: form.district,
        country: form.country,
        employmentType: form.employmentType,
        governmentId: form.governmentId,
        monthlyIncome: form.monthlyIncome === "" ? undefined : Number(form.monthlyIncome),
        bankName: resolvedBankName,
        accountNumber: form.accountNumber,
        branchCode: form.branchCode,
        reference1Name: form.reference1Name,
        reference1Phone: form.reference1Phone,
        reference2Name: form.reference2Name,
        reference2Phone: form.reference2Phone,
      });

      const savedProfile = response?.data?.item ?? response?.data?.data ?? null;
      const previousCompletion = Number(profile?.profileCompletion || 0);
      const nextCompletion = Number(savedProfile?.profileCompletion || 0);
      if (previousCompletion < 100 && nextCompletion === 100) setShowCongratsModal(true);

      const submitResponse = await api.post(submitUrl);
      const submittedProfile = submitResponse?.data?.item ?? submitResponse?.data?.data ?? savedProfile;

      setSuccess("Profile submitted successfully.");
      onSaved?.(submittedProfile);
    } catch (err) {
      if (err?.response?.status === 401) {
        setError("Session expired. Please login again.");
        return;
      }
      setError(err?.response?.data?.message || "Failed to submit profile");
    }
  };

  const uploadAvatar = async (file) => {
    setError("");
    setSuccess("");

    if (!file) {
      setError("Please choose an image file first.");
      return;
    }

    const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
    if (!allowed.has(file.type)) {
      setError("Only JPG, PNG, or WEBP images are allowed.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError("Image must be less than 2MB.");
      return;
    }

    setAvatarUploading(true);
    try {
      const payload = new FormData();
      payload.append("file", file);
      await api.post(avatarUrl, payload);
      setSuccess("Profile photo updated.");
      setShowAvatarModal(true);
      onAvatarSaved?.();
      window.setTimeout(() => setShowAvatarModal(false), 2200);
    } catch (err) {
      if (err?.response?.status === 401) {
        setError("Session expired. Please login again.");
        return;
      }
      setError(err?.response?.data?.message || "Failed to upload profile photo.");
    } finally {
      setAvatarUploading(false);
    }
  };

  return (
    <form id="profileForm" onSubmit={save} className="space-y-5 sm:space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-base font-semibold text-slate-800">Profile Photo</h3>
        <p className="mt-1 text-sm text-slate-500">JPG, PNG or WEBP. Max size 2MB.</p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-slate-300 bg-slate-100">
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
              onChange={(e) => {
                const nextFile = e.target.files?.[0] || null;
                if (nextFile) {
                  uploadAvatar(nextFile);
                }
                e.target.value = "";
              }}
              className="block w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
            />
            <div className="text-xs text-slate-500">
              {avatarUploading
                ? "Uploading image..."
                : profile?.avatarUrl
                ? "Choose a new image to change photo instantly."
                : "Choose an image to upload instantly."}
            </div>
            {!profile?.avatarUrl ? (
              <div className="text-xs font-medium text-amber-700">
                Profile photo is required before submitting Profile + KYC.
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-4 sm:p-5">
        <h2 className="text-lg font-semibold text-slate-800">Personal & Address Information</h2>
        <p className="mt-1 text-sm text-slate-500">
          Provide accurate details to improve your approval speed.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">Address Line</span>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            placeholder="Area, street, or plot details"
            value={form.addressLine1}
            onChange={(e) => setForm((p) => ({ ...p, addressLine1: e.target.value }))}
            required
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">City / Town</span>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            placeholder="Example: Lilongwe"
            value={form.city}
            onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
            required
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-sm font-medium text-slate-700">District</span>
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
            placeholder="Example: Blantyre"
            value={form.district}
            onChange={(e) => setForm((p) => ({ ...p, district: e.target.value }))}
            required
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

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-base font-semibold text-slate-800">Employment Details</h3>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Employment Type</span>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              value={form.employmentType}
              onChange={(e) => {
                const value = e.target.value;
                setForm((p) => ({ ...p, employmentType: value }));
                onEmploymentTypeChange?.(value);
              }}
              required
            >
              <option value="">Select employment type</option>
              <option>Government Employee</option>
              <option>Private Company Employee</option>
              <option>Self-Employed</option>
              <option>Farmer</option>
            </select>
          </label>

          {String(form.employmentType || "").trim().toLowerCase() === "government employee" ? (
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Government ID</span>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                placeholder="Enter your government ID"
                value={form.governmentId}
                onChange={(e) => setForm((p) => ({ ...p, governmentId: e.target.value }))}
                required
              />
            </label>
          ) : null}

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Monthly Income (MWK)</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Example: 350000"
              type="number"
              min="0"
              value={form.monthlyIncome}
              onChange={(e) => setForm((p) => ({ ...p, monthlyIncome: e.target.value }))}
              required
            />
          </label>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-base font-semibold text-slate-800">Bank Details (For Disbursement)</h3>
        <p className="mt-1 text-sm text-slate-500">
          Add once here. We use these details when your loan is approved.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="space-y-1.5 lg:col-span-2">
            <span className="text-sm font-medium text-slate-700">Bank Name</span>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              value={form.bankNameOption}
              onChange={(e) => setForm((p) => ({ ...p, bankNameOption: e.target.value }))}
              required
            >
              <option value="">Select bank</option>
              {BANK_OPTIONS.map((bank) => (
                <option key={bank} value={bank}>
                  {bank}
                </option>
              ))}
              <option value="Other">Other</option>
            </select>
          </label>

          {form.bankNameOption === "Other" ? (
            <label className="space-y-1.5 lg:col-span-2">
              <span className="text-sm font-medium text-slate-700">Other Bank Name</span>
              <input
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                placeholder="Enter your bank name"
                value={form.bankNameOther}
                onChange={(e) => setForm((p) => ({ ...p, bankNameOther: e.target.value }))}
                required
              />
            </label>
          ) : null}

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Account Number</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter account number"
              value={form.accountNumber}
              onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))}
              required
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Branch</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter branch Name"
              value={form.branchCode}
              onChange={(e) => setForm((p) => ({ ...p, branchCode: e.target.value }))}
              required
            />
          </label>
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-800">
        Keep your profile details up to date. This helps us verify your account faster.
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-base font-semibold text-slate-800">References</h3>
        <p className="mt-1 text-sm text-slate-500">
          Add two people we can contact if needed.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Reference 1 Name</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter first reference name"
              value={form.reference1Name}
              onChange={(e) => setForm((p) => ({ ...p, reference1Name: e.target.value }))}
              required
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Reference 1 Phone</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter first reference phone"
              value={form.reference1Phone}
              onChange={(e) => setForm((p) => ({ ...p, reference1Phone: e.target.value }))}
              required
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Reference 2 Name</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter second reference name"
              value={form.reference2Name}
              onChange={(e) => setForm((p) => ({ ...p, reference2Name: e.target.value }))}
              required
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Reference 2 Phone</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter second reference phone"
              value={form.reference2Phone}
              onChange={(e) => setForm((p) => ({ ...p, reference2Phone: e.target.value }))}
              required
            />
          </label>
        </div>
      </div>

      <button className="sr-only" type="submit">
        Save Profile
      </button>

      {showCongratsModal ? (
        <div className="fixed inset-0 z-[80] grid place-items-center px-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowCongratsModal(false)}
            aria-label="Close congratulations modal"
          />

          <div className="relative z-10 w-full max-w-md rounded-2xl border border-emerald-200 bg-white p-6 shadow-2xl">
            <div className="mb-3 inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <span className="text-xl font-bold">✓</span>
            </div>
            <h3 className="text-xl font-bold text-slate-900">Congratulations!</h3>
            <p className="mt-2 text-sm text-slate-600">
              Your profile is now 100% complete. You can continue with KYC submission.
            </p>

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowCongratsModal(false)}
                className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showAvatarModal ? (
        <div className="fixed inset-0 z-[85] grid place-items-center px-4">
          <div className="absolute inset-0 bg-black/45" />
          <div className="relative z-10 w-full max-w-sm rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <span className="text-2xl font-bold">+</span>
            </div>
            <h3 className="mt-4 text-xl font-semibold text-slate-900">Image Uploaded</h3>
            <p className="mt-2 text-sm text-slate-600">
              Your profile photo was uploaded successfully.
            </p>
          </div>
        </div>
      ) : null}
    </form>
  );
}
