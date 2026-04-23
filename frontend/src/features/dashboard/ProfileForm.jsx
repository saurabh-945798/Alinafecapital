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
  onGuarantorDocUploaded,
  setError,
  setSuccess,
  onEmploymentTypeChange,
  documentsComplete = false,
  onCompletionChange,
  apiBasePath = "/profile/me",
  submitUrl = "/profile/me/submit",
  avatarUrl = "/profile/me/avatar",
  docUploadUrl = "/profile/me/doc",
  declarationAccepted = false,
}) {
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [localAvatarUrl, setLocalAvatarUrl] = useState("");
  const [guarantorDocUploading, setGuarantorDocUploading] = useState(false);
  const [guarantorDocUploaded, setGuarantorDocUploaded] = useState(false);
  const [localGuarantorNationalIdDoc, setLocalGuarantorNationalIdDoc] = useState(null);
  const [guarantorDeclarationAccepted, setGuarantorDeclarationAccepted] = useState(false);
  const [showCongratsModal, setShowCongratsModal] = useState(false);
  const [showAvatarModal, setShowAvatarModal] = useState(false);
  const prevCompletionRef = useRef(Number(profile?.profileCompletion || 0));
  const [form, setForm] = useState({
    addressLine1: "",
    city: "",
    district: "",
    country: "Malawi",
    employmentType: "",
    businessName: "",
    businessActivityNature: "",
    jobTitle: "",
    employmentNumber: "",
    employmentStatus: "",
    contractDurationYears: "",
    contractDurationMonths: "",
    durationWorkedYears: "",
    durationWorkedMonths: "",
    hrContactPhone: "",
    governmentId: "",
    salaryDate: "",
    monthlyIncome: "",
    bankNameOption: "",
    bankNameOther: "",
    accountNumber: "",
    branchCode: "",
    reference1Name: "",
    reference1Phone: "",
    guarantorRelationship: "",
    guarantorOccupation: "",
    guarantorHomeVillage: "",
  });

  const profileGuarantorNationalIdDoc = Array.isArray(profile?.documents)
    ? profile.documents.find((doc) => doc?.type === "guarantor_national_id") || null
    : null;
  const guarantorNationalIdDoc = localGuarantorNationalIdDoc || profileGuarantorNationalIdDoc;
  const declarationDate = new Intl.DateTimeFormat("en-GB").format(new Date());

  useEffect(() => {
    const nextAvatar = String(profile?.avatarUrl || "").trim();
    if (!nextAvatar) return;
    setLocalAvatarUrl(nextAvatar);
  }, [profile?.avatarUrl]);

  useEffect(() => {
    if (profileGuarantorNationalIdDoc) {
      setLocalGuarantorNationalIdDoc(profileGuarantorNationalIdDoc);
    }
  }, [profileGuarantorNationalIdDoc?.fileUrl]);

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
      businessName: profile.businessName || "",
      businessActivityNature: profile.businessActivityNature || "",
      jobTitle: profile.jobTitle || "",
      employmentNumber: profile.employmentNumber || "",
      employmentStatus: profile.employmentStatus || "",
      contractDurationYears:
        profile.contractDurationYears !== undefined && profile.contractDurationYears !== null
          ? String(profile.contractDurationYears)
          : "",
      contractDurationMonths:
        profile.contractDurationMonths !== undefined && profile.contractDurationMonths !== null
          ? String(profile.contractDurationMonths)
          : "",
      durationWorkedYears:
        profile.durationWorkedYears !== undefined && profile.durationWorkedYears !== null
          ? String(profile.durationWorkedYears)
          : "",
      durationWorkedMonths:
        profile.durationWorkedMonths !== undefined && profile.durationWorkedMonths !== null
          ? String(profile.durationWorkedMonths)
          : "",
      hrContactPhone: profile.hrContactPhone || "",
      governmentId: profile.governmentId || "",
      salaryDate: profile.salaryDate || "",
      monthlyIncome: profile.monthlyIncome || "",
      bankNameOption: isKnownBank ? existingBankName : existingBankName ? "Other" : "",
      bankNameOther: isKnownBank ? "" : existingBankName,
      accountNumber: profile.accountNumber || "",
      branchCode: profile.branchCode || "",
      reference1Name: profile.reference1Name || "",
      reference1Phone: profile.reference1Phone || "",
      guarantorRelationship: profile.guarantorRelationship || profile.guarantorRelationship || "",
      guarantorOccupation: profile.guarantorOccupation || profile.guarantorOccupation || "",
      guarantorHomeVillage: profile.guarantorHomeVillage || profile.guarantorHomeVillage || "",
    });
    onEmploymentTypeChange?.(profile.employmentType || "");
  }, [
    onEmploymentTypeChange,
    profile?.addressLine1,
    profile?.city,
    profile?.district,
    profile?.country,
    profile?.employmentType,
    profile?.businessName,
    profile?.businessActivityNature,
    profile?.jobTitle,
    profile?.employmentNumber,
    profile?.employmentStatus,
    profile?.contractDurationYears,
    profile?.contractDurationMonths,
    profile?.durationWorkedYears,
    profile?.durationWorkedMonths,
    profile?.hrContactPhone,
    profile?.governmentId,
    profile?.salaryDate,
    profile?.monthlyIncome,
    profile?.bankName,
    profile?.accountNumber,
    profile?.branchCode,
    profile?.reference1Name,
    profile?.reference1Phone,
    profile?.guarantorRelationship,
    profile?.guarantorOccupation,
    profile?.guarantorHomeVillage,
    profile?.guarantorRelationship,
    profile?.guarantorOccupation,
    profile?.guarantorHomeVillage,
  ]);

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
    const isPrivateCompanyEmployee =
      String(form.employmentType || "").trim().toLowerCase() === "private company employee";
    const isSelfEmployed =
      String(form.employmentType || "").trim().toLowerCase() === "self-employed";
    const requiresSalaryDate =
      isGovernmentEmployee || isPrivateCompanyEmployee || isSelfEmployed;
    const isFarmer = String(form.employmentType || "").trim().toLowerCase() === "farmer";
    const isBusiness = String(form.employmentType || "").trim().toLowerCase() === "business";
    const isFixedContract = String(form.employmentStatus || "").trim() === "fixed_contract";
    const hasAvatar = !!String(localAvatarUrl || profile?.avatarUrl || "").trim();

    const sectionsComplete =
      hasAvatar &&
      !!String(form.addressLine1 || "").trim() &&
      !!String(form.city || "").trim() &&
      !!String(form.district || "").trim() &&
      !!String(form.employmentType || "").trim() &&
      (isBusiness
        ? !!String(form.businessName || "").trim() &&
          !!String(form.businessActivityNature || "").trim()
        : isFarmer
        ? true
        : !!String(form.jobTitle || "").trim() &&
            ((isPrivateCompanyEmployee || isSelfEmployed) ||
              !!String(form.employmentNumber || "").trim()) &&
            !!String(form.employmentStatus || "").trim() &&
            (!isFixedContract ||
              (!!String(form.contractDurationYears || "").trim() &&
                !!String(form.contractDurationMonths || "").trim())) &&
            !!String(form.durationWorkedYears || "").trim() &&
            !!String(form.durationWorkedMonths || "").trim() &&
            !!String(form.hrContactPhone || "").trim()) &&
      (!isGovernmentEmployee || !!String(form.governmentId || "").trim()) &&
      (!requiresSalaryDate || !!String(form.salaryDate || "").trim()) &&
      !!String(form.monthlyIncome || "").trim() &&
      Number(form.monthlyIncome) > 0 &&
      !!resolvedBankName &&
      (form.bankNameOption !== "Other" || !!String(form.bankNameOther || "").trim()) &&
      !!String(form.accountNumber || "").trim() &&
      !!String(form.branchCode || "").trim() &&
      !!String(form.reference1Name || "").trim() &&
      !!String(form.reference1Phone || "").trim() &&
      !!String(form.guarantorRelationship || form.guarantorRelationship || "").trim() &&
      !!guarantorNationalIdDoc &&
      !!String(form.guarantorOccupation || form.guarantorOccupation || "").trim() &&
      !!String(form.guarantorHomeVillage || form.guarantorHomeVillage || "").trim() &&
      guarantorDeclarationAccepted;

    onCompletionChange?.(sectionsComplete);
  }, [form, guarantorNationalIdDoc, guarantorDeclarationAccepted, localAvatarUrl, onCompletionChange, profile?.avatarUrl]);

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
    const isPrivateCompanyEmployee =
      String(form.employmentType || "").trim().toLowerCase() === "private company employee";
    const isSelfEmployed =
      String(form.employmentType || "").trim().toLowerCase() === "self-employed";
    const requiresSalaryDate =
      isGovernmentEmployee || isPrivateCompanyEmployee || isSelfEmployed;
    const isFarmer = String(form.employmentType || "").trim().toLowerCase() === "farmer";
    const isBusiness = String(form.employmentType || "").trim().toLowerCase() === "business";
    const isFixedContract = String(form.employmentStatus || "").trim() === "fixed_contract";

    if (!String(localAvatarUrl || profile?.avatarUrl || "").trim()) {
      return "Please upload your profile photo.";
    }
    if (!String(form.addressLine1 || "").trim()) return "Please enter your address line.";
    if (!String(form.city || "").trim()) return "Please enter your city or town.";
    if (!String(form.district || "").trim()) return "Please enter your district.";
    if (!String(form.employmentType || "").trim()) return "Please select your employment type.";
    if (isBusiness) {
      if (!String(form.businessName || "").trim()) {
        return "Please enter business name.";
      }
      if (!String(form.businessActivityNature || "").trim()) {
        return "Please select nature of business activity.";
      }
    } else if (!isFarmer) {
      if (!String(form.jobTitle || "").trim()) return "Please enter your job title.";
      if (
        !isPrivateCompanyEmployee &&
        !isSelfEmployed &&
        !String(form.employmentNumber || "").trim()
      ) {
        return "Please enter employment number.";
      }
      if (!String(form.employmentStatus || "").trim()) {
        return "Please select employment status.";
      }
      if (isFixedContract) {
        if (!String(form.contractDurationYears || "").trim()) {
          return "Please enter fixed contract duration years.";
        }
        if (!String(form.contractDurationMonths || "").trim()) {
          return "Please enter fixed contract duration months.";
        }
      }
      if (!String(form.durationWorkedYears || "").trim()) {
        return "Please enter duration worked in years.";
      }
      if (!String(form.durationWorkedMonths || "").trim()) {
        return "Please enter duration worked in months.";
      }
      if (!String(form.hrContactPhone || "").trim()) {
        return "Please enter employer HR contact phone number.";
      }
    }
    if (isGovernmentEmployee && !String(form.governmentId || "").trim()) {
      return "Please enter your government ID.";
    }
    if (requiresSalaryDate && !String(form.salaryDate || "").trim()) {
      return "Please select date of salary.";
    }
    if (!String(form.monthlyIncome || "").trim()) return "Please enter your monthly income.";
    if (Number(form.monthlyIncome) <= 0) return "Monthly income must be greater than zero.";
    if (!resolvedBankName) return "Please select your bank name.";
    if (form.bankNameOption === "Other" && !String(form.bankNameOther || "").trim()) {
      return "Please enter your bank name.";
    }
    if (!String(form.accountNumber || "").trim()) return "Please enter your account number.";
    if (!String(form.branchCode || "").trim()) return "Please enter your branch.";
    if (!String(form.reference1Name || "").trim()) return "Please enter guarantor full name.";
    if (!String(form.reference1Phone || "").trim()) return "Please enter guarantor phone number.";
    if (!String(form.guarantorRelationship || form.guarantorRelationship || "").trim()) return "Please enter guarantor relationship.";
    if (!guarantorNationalIdDoc) return "Please upload guarantor National ID document.";
    if (!String(form.guarantorOccupation || form.guarantorOccupation || "").trim()) return "Please enter guarantor occupation.";
    if (!String(form.guarantorHomeVillage || form.guarantorHomeVillage || "").trim()) return "Please enter guarantor home village.";

    return "";
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    const action = e?.nativeEvent?.submitter?.value || "save";

    const resolvedBankName =
      form.bankNameOption === "Other"
        ? String(form.bankNameOther || "").trim()
        : form.bankNameOption;

    const validationMessage = validateForm();
    if (validationMessage) {
      setError(validationMessage);
      return;
    }

    if (action === "submit" && !documentsComplete) {
      setError("Please upload all required KYC documents before submitting.");
      return;
    }

    if (action === "submit" && !declarationAccepted) {
      setError("Please accept the loan applicant declaration before submitting.");
      return;
    }

    try {
      const isPrivateCompanyEmployee =
        String(form.employmentType || "").trim().toLowerCase() === "private company employee";
      const isSelfEmployed =
        String(form.employmentType || "").trim().toLowerCase() === "self-employed";
      const isFarmer = String(form.employmentType || "").trim().toLowerCase() === "farmer";
      const isBusiness = String(form.employmentType || "").trim().toLowerCase() === "business";
      const isGovernmentEmployee =
        String(form.employmentType || "").trim().toLowerCase() === "government employee";
      const requiresSalaryDate =
        isGovernmentEmployee || isPrivateCompanyEmployee || isSelfEmployed;
      const response = await api.put(apiBasePath, {
        addressLine1: form.addressLine1,
        city: form.city,
        district: form.district,
        country: form.country,
        employmentType: form.employmentType,
        businessName: isBusiness ? form.businessName : undefined,
        businessActivityNature: isBusiness ? form.businessActivityNature : undefined,
        jobTitle: isBusiness || isFarmer ? undefined : form.jobTitle,
        employmentNumber:
          isBusiness || isFarmer || isPrivateCompanyEmployee || isSelfEmployed
            ? undefined
            : form.employmentNumber,
        employmentStatus: isBusiness || isFarmer ? undefined : form.employmentStatus,
        contractDurationYears:
          isBusiness || isFarmer || form.contractDurationYears === ""
            ? undefined
            : Number(form.contractDurationYears),
        contractDurationMonths:
          isBusiness || isFarmer || form.contractDurationMonths === ""
            ? undefined
            : Number(form.contractDurationMonths),
        durationWorkedYears:
          isBusiness || isFarmer || form.durationWorkedYears === ""
            ? undefined
            : Number(form.durationWorkedYears),
        durationWorkedMonths:
          isBusiness || isFarmer || form.durationWorkedMonths === ""
            ? undefined
            : Number(form.durationWorkedMonths),
        hrContactPhone: isBusiness || isFarmer ? undefined : form.hrContactPhone,
        governmentId: isGovernmentEmployee ? form.governmentId : undefined,
        salaryDate: requiresSalaryDate ? form.salaryDate : undefined,
        monthlyIncome: form.monthlyIncome === "" ? undefined : Number(form.monthlyIncome),
        bankName: resolvedBankName,
        accountNumber: form.accountNumber,
        branchCode: form.branchCode,
        reference1Name: form.reference1Name,
        reference1Phone: form.reference1Phone,
        reference2Name: form.reference1Name,
        reference2Phone: form.reference1Phone,
        guarantorRelationship: form.guarantorRelationship || form.guarantorRelationship,
        guarantorOccupation: form.guarantorOccupation || form.guarantorOccupation,
        guarantorHomeVillage: form.guarantorHomeVillage || form.guarantorHomeVillage,
      });

      const savedProfile = response?.data?.item ?? response?.data?.data ?? null;
      const previousCompletion = Number(profile?.profileCompletion || 0);
      const nextCompletion = Number(savedProfile?.profileCompletion || 0);
      if (previousCompletion < 100 && nextCompletion === 100) setShowCongratsModal(true);

      if (action === "submit") {
        const submitResponse = await api.post(submitUrl);
        const submittedProfile =
          submitResponse?.data?.item ?? submitResponse?.data?.data ?? savedProfile;
        setSuccess("Profile submitted successfully.");
        onSaved?.(submittedProfile, "submit");
        return;
      }

      setSuccess("Profile saved successfully.");
      onSaved?.(savedProfile, "save");
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
      const { data } = await api.post(avatarUrl, payload);
      const nextProfile = data?.item ?? data?.data ?? null;
      const nextAvatar = String(nextProfile?.avatarUrl || "").trim();
      if (nextAvatar) {
        setLocalAvatarUrl(nextAvatar);
      }
      setSuccess("Profile photo updated.");
      setShowAvatarModal(true);
      onAvatarSaved?.(nextProfile);
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

  const getUploadedFileName = (doc) => {
    if (!doc?.fileUrl) return "";
    const cleanPath = String(doc.fileUrl).split("?")[0];
    const rawName = cleanPath.substring(cleanPath.lastIndexOf("/") + 1);
    const withoutStamp = rawName.replace(/^\d+-/, "");
    return decodeURIComponent(withoutStamp || rawName);
  };

  const uploadGuarantorNationalId = async (file) => {
    setError("");
    setSuccess("");

    if (!file) return;

    const allowedTypes = new Set([
      "application/pdf",
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ]);
    const extension = String(file.name || "")
      .toLowerCase()
      .split(".")
      .pop();
    const allowedExtensions = new Set(["pdf", "jpg", "jpeg", "png", "webp"]);
    const allowedByMime = allowedTypes.has(file.type);
    const allowedByExtension =
      file.type === "application/octet-stream" && allowedExtensions.has(extension);
    if (!allowedByMime && !allowedByExtension) {
      setError("guarantor National ID must be PDF, JPG, JPEG, PNG, or WEBP.");
      return;
    }

    setGuarantorDocUploading(true);
    setGuarantorDocUploaded(false);
    try {
      const formData = new FormData();
      formData.append("type", "guarantor_national_id");
      formData.append("file", file);
      const { data } = await api.post(docUploadUrl, formData);
      const nextProfile = data?.item ?? data?.data ?? null;
      const nextDoc = Array.isArray(nextProfile?.documents)
        ? nextProfile.documents.find((doc) => doc?.type === "guarantor_national_id") || null
        : null;
      setLocalGuarantorNationalIdDoc(nextDoc);
      setGuarantorDocUploaded(true);
      onGuarantorDocUploaded?.(nextProfile);
      window.setTimeout(() => setGuarantorDocUploaded(false), 2000);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to upload guarantor National ID document.");
    } finally {
      setGuarantorDocUploading(false);
    }
  };

  const normalizedEmploymentType = String(form.employmentType || "").trim().toLowerCase();
  const isBusinessEmployment = normalizedEmploymentType === "business";
  const isFarmerEmployment = normalizedEmploymentType === "farmer";
  const requiresSalaryDateEmployment = [
    "government employee",
    "private company employee",
    "self-employed",
  ].includes(normalizedEmploymentType);
  const hideEmploymentNumber = [
    "private company employee",
    "self-employed",
    "farmer",
  ].includes(normalizedEmploymentType);

  return (
    <form id="profileForm" onSubmit={save} className="space-y-5 sm:space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <h3 className="text-base font-semibold text-slate-800">Profile Photo</h3>
        <p className="mt-1 text-sm text-slate-500">
          JPG, PNG or WEBP only. Max size 2MB. PDF files should be uploaded in the KYC
          Documents section below.
        </p>
        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-slate-300 bg-slate-100">
            {String(localAvatarUrl || profile?.avatarUrl || "").trim() ? (
              <img
                src={resolveAssetUrl(localAvatarUrl || profile?.avatarUrl)}
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
                : String(localAvatarUrl || profile?.avatarUrl || "").trim()
                ? "Choose a new image to change photo instantly."
                : "Choose an image to upload instantly. PDF files belong in the KYC document upload section."}
            </div>
            {!String(localAvatarUrl || profile?.avatarUrl || "").trim() ? (
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
                const normalizedValue = String(value || "").trim().toLowerCase();
                setForm((p) => ({
                  ...p,
                  employmentType: value,
                  employmentNumber:
                    ["private company employee", "self-employed", "farmer"].includes(
                      normalizedValue
                    )
                      ? ""
                      : p.employmentNumber,
                  jobTitle: normalizedValue === "farmer" ? "" : p.jobTitle,
                  employmentStatus: normalizedValue === "farmer" ? "" : p.employmentStatus,
                  contractDurationYears:
                    normalizedValue === "farmer" ? "" : p.contractDurationYears,
                  contractDurationMonths:
                    normalizedValue === "farmer" ? "" : p.contractDurationMonths,
                  durationWorkedYears: normalizedValue === "farmer" ? "" : p.durationWorkedYears,
                  durationWorkedMonths:
                    normalizedValue === "farmer" ? "" : p.durationWorkedMonths,
                  hrContactPhone: normalizedValue === "farmer" ? "" : p.hrContactPhone,
                  salaryDate: ["government employee", "private company employee", "self-employed"].includes(
                    normalizedValue
                  )
                    ? p.salaryDate
                    : "",
                }));
                onEmploymentTypeChange?.(value);
              }}
              required
            >
              <option value="">Select employment type</option>
              <option value="Government Employee">Government Employee</option>
              <option value="Private Company Employee">Private Company Employee</option>
              <option value="Self-Employed">Self-Employed</option>
              <option value="Farmer">Farmer</option>
              <option value="Business">Business</option>
            </select>
          </label>

          {normalizedEmploymentType === "government employee" ? (
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

          {isBusinessEmployment ? (
            <>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Business Name</span>
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  placeholder="Enter business name"
                  value={form.businessName}
                  onChange={(e) => setForm((p) => ({ ...p, businessName: e.target.value }))}
                  required
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Nature of Business Activity</span>
                <select
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={form.businessActivityNature}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, businessActivityNature: e.target.value }))
                  }
                  required
                >
                  <option value="">Select business activity</option>
                  <option value="Retail Trade">Retail Trade</option>
                  <option value="Wholesale Trade">Wholesale Trade</option>
                  <option value="Farming / Agriculture">Farming / Agriculture</option>
                  <option value="Transport">Transport</option>
                  <option value="Construction">Construction</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Services">Services</option>
                  <option value="Education">Education</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Hospitality">Hospitality</option>
                  <option value="Other">Other</option>
                </select>
              </label>
            </>
          ) : isFarmerEmployment ? null : (
            <>
              <label className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Job Title</span>
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  placeholder="Enter job title"
                  value={form.jobTitle}
                  onChange={(e) => setForm((p) => ({ ...p, jobTitle: e.target.value }))}
                  required
                />
              </label>

              {!hideEmploymentNumber ? (
                <label className="space-y-1.5">
                  <span className="text-sm font-medium text-slate-700">Employment Number</span>
                  <input
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                    placeholder="Enter employment number"
                    value={form.employmentNumber}
                    onChange={(e) => setForm((p) => ({ ...p, employmentNumber: e.target.value }))}
                    required
                  />
                </label>
              ) : null}

              <label className="space-y-1.5 lg:col-span-2">
                <span className="text-sm font-medium text-slate-700">Employment Status</span>
                <select
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  value={form.employmentStatus}
                  onChange={(e) => setForm((p) => ({ ...p, employmentStatus: e.target.value }))}
                  required
                >
                  <option value="">Select employment status</option>
                  <option value="full_time">Full-Time</option>
                  <option value="part_time">Part-Time</option>
                  <option value="fixed_contract">Fixed Contract</option>
                </select>
              </label>

              {String(form.employmentStatus || "").trim() === "fixed_contract" ? (
                <>
                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">
                      Fixed Contract Duration (Years)
                    </span>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      type="number"
                      min="0"
                      placeholder="Years"
                      value={form.contractDurationYears}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, contractDurationYears: e.target.value }))
                      }
                      required
                    />
                  </label>

                  <label className="space-y-1.5">
                    <span className="text-sm font-medium text-slate-700">
                      Fixed Contract Duration (Months)
                    </span>
                    <input
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                      type="number"
                      min="0"
                      placeholder="Months"
                      value={form.contractDurationMonths}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, contractDurationMonths: e.target.value }))
                      }
                      required
                    />
                  </label>
                </>
              ) : null}

              <label className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Duration Worked (Years)</span>
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  type="number"
                  min="0"
                  placeholder="Years"
                  value={form.durationWorkedYears}
                  onChange={(e) => setForm((p) => ({ ...p, durationWorkedYears: e.target.value }))}
                  required
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-sm font-medium text-slate-700">Duration Worked (Months)</span>
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  type="number"
                  min="0"
                  placeholder="Months"
                  value={form.durationWorkedMonths}
                  onChange={(e) => setForm((p) => ({ ...p, durationWorkedMonths: e.target.value }))}
                  required
                />
              </label>

              <label className="space-y-1.5 lg:col-span-2">
                <span className="text-sm font-medium text-slate-700">
                  Employer’s Contact (HR Phone Number)
                </span>
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                  placeholder="Enter HR phone number"
                  value={form.hrContactPhone}
                  onChange={(e) => setForm((p) => ({ ...p, hrContactPhone: e.target.value }))}
                  required
                />
              </label>
            </>
          )}

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

          {requiresSalaryDateEmployment ? (
            <label className="space-y-1.5">
              <span className="text-sm font-medium text-slate-700">Date of Salary</span>
              <input
                type="date"
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                value={form.salaryDate}
                onChange={(e) => setForm((p) => ({ ...p, salaryDate: e.target.value }))}
                required
              />
            </label>
          ) : null}

          {!isFarmerEmployment ? (
            <p className="text-xs text-slate-500 lg:col-span-2">
              Please attach your payslip for 3 consecutive months in the KYC Documents section.
            </p>
          ) : null}
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
        <h3 className="text-base font-semibold text-slate-800">Guarantor / Witness</h3>
        <p className="mt-1 text-sm text-slate-500">
          Add the guarantor or witness details below.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Full Name</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter full name"
              value={form.reference1Name}
              onChange={(e) => setForm((p) => ({ ...p, reference1Name: e.target.value }))}
              required
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Phone Number</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter phone number"
              value={form.reference1Phone}
              onChange={(e) => setForm((p) => ({ ...p, reference1Phone: e.target.value }))}
              required
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Relationship</span>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              value={form.guarantorRelationship || form.guarantorRelationship}
              onChange={(e) => setForm((p) => ({ ...p, guarantorRelationship: e.target.value }))}
              required
            >
              <option value="">Select relationship</option>
              <option value="Spouse">Spouse</option>
              <option value="Parent">Parent</option>
              <option value="Sibling">Sibling</option>
              <option value="Relative">Relative</option>
              <option value="Friend">Friend</option>
              <option value="Employer">Employer</option>
              <option value="Colleague">Colleague</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">National ID  </span>
            <div className="space-y-2 rounded-xl border border-slate-300 bg-white p-3">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp,application/pdf,image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const nextFile = e.target.files?.[0] || null;
                  uploadGuarantorNationalId(nextFile);
                  e.target.value = "";
                }}
                className="block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white hover:file:bg-slate-800"
              />
              {guarantorDocUploading ? (
                <p className="text-xs font-medium text-amber-700">Uploading document...</p>
              ) : null}
              {guarantorNationalIdDoc ? (
                <p className="text-xs text-emerald-700">
                  Uploaded: {getUploadedFileName(guarantorNationalIdDoc) || "Guarantor National ID"}
                </p>
              ) : null}
              {guarantorDocUploaded ? (
                <p className="text-xs font-medium text-emerald-700">Uploaded successfully.</p>
              ) : null}
            </div>
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Occupation</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter occupation"
              value={form.guarantorOccupation || form.guarantorOccupation}
              onChange={(e) => setForm((p) => ({ ...p, guarantorOccupation: e.target.value }))}
              required
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Home Village</span>
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
              placeholder="Enter home village"
              value={form.guarantorHomeVillage || form.guarantorHomeVillage}
              onChange={(e) => setForm((p) => ({ ...p, guarantorHomeVillage: e.target.value }))}
              required
            />
          </label>
        </div>

        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-700">
          <p className="font-semibold uppercase tracking-wide text-slate-800">For Guarantor Use Only</p>
          <p className="mt-2">
            I, {String(form.reference1Name || "").trim() || "the undersigned"}, hereby agree to act as a guarantor for the
            loan requested by {String(profile?.fullName || "").trim() || "the applicant"}.
            I fully understand the terms and conditions of this loan, and I acknowledge that I will be liable for
            the loan in the event that he/she defaults on repayment.
          </p>
          <p className="mt-2">
            Date: {declarationDate}
          </p>

          <label className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-2.5 text-xs text-slate-700">
            <input
              type="checkbox"
              checked={guarantorDeclarationAccepted}
              onChange={(e) => setGuarantorDeclarationAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-300"
            />
            <span>I confirm the guarantor declaration above.</span>
          </label>
        </div>
      </div>

      <button className="sr-only" type="submit" value="save">
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
