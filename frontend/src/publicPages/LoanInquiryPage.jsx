import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  PhoneCall,
  ShieldCheck,
  X,
} from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../services/api";

const BRAND_NAVY = "#002D5B";

const PUBLIC_LOAN_OPTIONS = [
  { slug: "civil-servant-loan", name: "Civil Servant Loan" },
  { slug: "emergency-loan", name: "Emergency Loan" },
  { slug: "statutory-company-loans", name: "Statutory Company Loans" },
  { slug: "private-company-loans", name: "Private company loans" },
  { slug: "business-loan", name: "Business Loan" },
];

const normalizeLoanText = (value = "") =>
  String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const GENDER_OPTIONS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
];

const MARITAL_OPTIONS = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married" },
  { value: "divorced", label: "Divorced" },
  { value: "widowed", label: "Widowed" },
];

const HOUSING_OPTIONS = [
  { value: "tenant", label: "Tenant" },
  { value: "home_owner", label: "Home Owner" },
];

const EMPLOYMENT_OPTIONS = [
  { value: "employed", label: "Employed" },
  { value: "not_employed", label: "Not Employed" },
];

const BORROWER_OPTIONS = [
  { value: "first_time", label: "First Time Borrower" },
  { value: "repeat", label: "Repeat Borrower" },
];

const EMPLOYMENT_TYPE_OPTIONS = [
  "Government Employee",
  "Private Company Employee",
  "Self-Employed",
  "Business",
  "Farmer",
];

const BUSINESS_NATURE_OPTIONS = [
  "Retail/Shop",
  "Trading",
  "Farming/Agriculture",
  "Transport",
  "Services",
  "Construction",
  "Other",
];

const GUARANTOR_RELATIONSHIP_OPTIONS = [
  "Spouse",
  "Parent",
  "Sibling",
  "Relative",
  "Friend",
  "Colleague",
  "Other",
];

const FRIENDLY_FIELD_LABELS = {
  fullName: "Full name",
  phone: "Phone number",
  email: "Email",
  address: "Address",
  dateOfBirth: "Date of birth",
  gender: "Gender",
  maritalStatus: "Marital status",
  loanProductSlug: "Loan type",
  requestedAmount: "Requested loan amount",
  preferredTenureMonths: "Tenure",
  applicantNationalIdNumber: "Applicant national ID number",
  applicantOccupation: "Applicant occupation",
  homeVillage: "Home village",
  traditionalAuthority: "Traditional Authority (T/A)",
  residenceDistrict: "Residence district",
  employmentType: "Employment type",
  employerNameOrBusinessAddress: "Employer / business address",
  businessActivityNature: "Nature of business activity",
  jobTitle: "Job title",
  salaryDate: "Date of salary/income",
  monthlyIncome: "Monthly income",
  collateral: "Collateral",
  bankName: "Bank name",
  accountHolderName: "Account holder name",
  accountNumber: "Account number",
  branchCode: "Bank branch",
  reference1Name: "Guarantor full name",
  reference1Phone: "Guarantor phone number",
  guarantorRelationship: "Guarantor relationship",
  guarantorNationalId: "Guarantor national ID number",
};

const toFriendlyValidationMessage = (issue) => {
  const pathKey = Array.isArray(issue?.path) && issue.path.length ? String(issue.path[0]) : "";
  const fieldLabel = FRIENDLY_FIELD_LABELS[pathKey] || "This field";

  if (issue?.code === "invalid_type" && issue?.expected === "string") {
    return `${fieldLabel} is required.`;
  }
  if (issue?.code === "too_small" && issue?.minimum === 2) {
    return `${fieldLabel} is too short. Please enter at least 2 characters.`;
  }
  if (issue?.code === "too_small" && issue?.minimum === 1) {
    return `${fieldLabel} is required.`;
  }
  if (issue?.code === "invalid_string" && issue?.validation === "email") {
    return "Please enter a valid email address.";
  }
  if (issue?.message) {
    return `${fieldLabel}: ${issue.message}`;
  }
  return "Please review the highlighted form fields and try again.";
};

function ChoiceGrid({ label, name, value, onChange, options, hint, columns = 1 }) {
  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-baseline gap-1.5 border-b border-slate-200 pb-2">
          <p className="text-sm font-semibold text-slate-900">{label}</p>
          <span className="text-xs font-medium italic text-orange-500">(Required)</span>
        </div>
        {hint ? <p className="mt-2 text-xs leading-5 text-slate-500">{hint}</p> : null}
      </div>

      <div className={["grid gap-3", columns === 2 ? "sm:grid-cols-2" : ""].join(" ").trim()}>
        {options.map((option) => {
          const active = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onChange(name, option.value)}
              className={[
                "flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 text-left text-slate-700 transition",
                active
                  ? "border-slate-900 bg-slate-50 shadow-sm"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50",
              ].join(" ")}
            >
              <span
                className={[
                  "flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px] border transition",
                  active ? "border-slate-900 bg-slate-900 text-white" : "border-slate-300 bg-white text-transparent",
                ].join(" ")}
              >
                <Check size={13} strokeWidth={3} />
              </span>
              <span className="text-sm font-medium">{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function LoanInquiryPage() {
  const [searchParams] = useSearchParams();
  const initialSlug = searchParams.get("product") || "";

  const [loanProducts, setLoanProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitStage, setSubmitStage] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [profilePhotoFile, setProfilePhotoFile] = useState(null);
  const [applicantNationalIdFile, setApplicantNationalIdFile] = useState(null);
  const [bankStatementFile, setBankStatementFile] = useState(null);
  const [payslipFile, setPayslipFile] = useState(null);
  const [collateralFile, setCollateralFile] = useState(null);
  const [guarantorNationalIdFile, setGuarantorNationalIdFile] = useState(null);
  const [form, setForm] = useState({
    fullName: "",
    address: "",
    phone: "",
    email: "",
    dateOfBirth: "",
    gender: "",
    maritalStatus: "",
    dependants: "",
    housingStatus: "",
    employmentStatus: "",
    borrowerType: "",
    loanProductSlug: initialSlug,
    requestedAmount: "",
    preferredTenureMonths: "",
    description: "",
    applicantNationalIdNumber: "",
    applicantOccupation: "",
    homeVillage: "",
    traditionalAuthority: "",
    residenceArea: "",
    residenceDistrict: "",
    employerNameOrBusinessAddress: "",
    businessActivityNature: "",
    jobTitle: "",
    employmentNumber: "",
    employmentType: "",
    contractDurationYears: "",
    contractDurationMonths: "",
    durationWorkedYears: "",
    durationWorkedMonths: "",
    hrContactPhone: "",
    salaryDate: "",
    monthlyIncome: "",
    bankName: "",
    accountHolderName: "",
    accountNumber: "",
    accountPhoneNumber: "",
    bankBranch: "",
    guarantorFullName: "",
    guarantorPhone: "",
    guarantorRelationship: "",
    guarantorNationalId: "",
    guarantorOccupation: "",
    guarantorHomeVillage: "",
    guarantorTA: "",
    guarantorDistrict: "",
    guarantorResidenceArea: "",
    guarantorResidenceDistrict: "",
    declarationAccepted: false,
    guarantorDeclarationAccepted: false,
  });

  const mergedLoanOptions = useMemo(() => {
    const byName = new Map(
      loanProducts.map((item) => [normalizeLoanText(item?.name), item])
    );
    const bySlug = new Map(loanProducts.map((item) => [item?.slug, item]));

    return PUBLIC_LOAN_OPTIONS.map((preset) => {
      const matched =
        bySlug.get(preset.slug) ||
        byName.get(normalizeLoanText(preset.name));

      return {
        slug: matched?.slug || preset.slug,
        name: preset.name,
      };
    });
  }, [loanProducts]);

  useEffect(() => {
    let mounted = true;

    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const { data } = await api.get("/loan-products");
        const items = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data?.data?.items)
          ? data.data.items
          : [];
        if (mounted) setLoanProducts(items);
      } catch {
        if (mounted) setLoanProducts([]);
      } finally {
        if (mounted) setLoadingProducts(false);
      }
    };

    fetchProducts();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!form.loanProductSlug && initialSlug) {
      setForm((prev) => ({ ...prev, loanProductSlug: initialSlug }));
    }
  }, [form.loanProductSlug, initialSlug]);

  const updateField = (name, value) => {
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = () => {
    const normalizedEmploymentType = String(form.employmentType || "").trim().toLowerCase();
    const isGovernmentEmployee = normalizedEmploymentType === "government employee";
    const isPrivateCompanyEmployee = normalizedEmploymentType === "private company employee";
    const isSelfEmployed = normalizedEmploymentType === "self-employed";
    const isFarmer = normalizedEmploymentType === "farmer";
    const isBusiness = normalizedEmploymentType === "business";
    const requiresPayslip = !(isFarmer || isSelfEmployed);
    const requiresSalaryDate = isGovernmentEmployee || isPrivateCompanyEmployee || isSelfEmployed;
    const requiresEmployerSection = !isFarmer;

    if (form.fullName.trim().length < 2) return "Full name must be at least 2 characters.";
    if (form.address.trim().length < 5) return "Address must be at least 5 characters.";
    if (!form.phone.trim() || form.phone.trim().length !== 9) {
      return "Enter a valid 9-digit phone number.";
    }
    if (!form.email.trim()) return "Email is required.";
    if (!form.dateOfBirth) return "Date of birth is required.";
    if (!form.gender) return "Please select gender.";
    if (!form.maritalStatus) return "Please select marital status.";
    if (form.dependants === "") return "Please select number of dependants.";
    const dependantsValue = Number(form.dependants);
    if (!Number.isInteger(dependantsValue) || dependantsValue < 0 || dependantsValue > 20) {
      return "Dependants must be a whole number between 0 and 20.";
    }
    if (!form.housingStatus) return "Please select housing status.";
    if (!form.employmentStatus) return "Please select employment status.";
    if (!form.borrowerType) return "Please select borrower type.";
    if (!form.loanProductSlug) return "Please select loan type.";
    if (!form.requestedAmount.trim()) return "Loan amount is required.";
    if (Number(form.requestedAmount) <= 0) return "Loan amount must be greater than 0.";
    if (!form.preferredTenureMonths) return "Please select tenure.";
    if (form.description.trim().length < 3) return "Description must be at least 3 characters.";
    if (!form.applicantNationalIdNumber.trim()) return "Applicant national ID number is required.";
    if (!profilePhotoFile) return "Profile photo is required.";
    if (!applicantNationalIdFile) return "Applicant national ID attachment is required.";
    if (!bankStatementFile) return "Bank statement (3 months) is required.";
    if (requiresPayslip && !payslipFile) return "Payslip or business proof is required.";
    if (!form.applicantOccupation.trim()) return "Applicant occupation is required.";
    if (!form.homeVillage.trim()) return "Home village is required.";
    if (!form.traditionalAuthority.trim()) return "T/A is required.";
    if (!form.residenceDistrict.trim()) return "Residence district is required.";
    if (!form.employmentType.trim()) return "Employment type is required.";
    if (isBusiness) {
      if (!form.employerNameOrBusinessAddress.trim()) return "Business full address is required.";
      if (!form.businessActivityNature.trim()) return "Nature of business activity is required.";
    }
    if (requiresEmployerSection && !isBusiness) {
      if (!form.employerNameOrBusinessAddress.trim()) return "Employer full address is required.";
      if (!form.jobTitle.trim()) return "Job title is required.";
      if (isGovernmentEmployee && !form.employmentNumber.trim()) {
        return "Employment number is required.";
      }
      if (!form.durationWorkedYears.trim() && !form.durationWorkedMonths.trim()) {
        return "Duration worked is required.";
      }
    }
    if (requiresSalaryDate && !form.salaryDate) return "Date of salary/income is required.";
    if (requiresSalaryDate) {
      const salaryDay = Number(form.salaryDate);
      if (!Number.isInteger(salaryDay) || salaryDay < 1 || salaryDay > 31) {
        return "Date of salary/income must be a day between 1 and 31.";
      }
    }
    if (!form.monthlyIncome.trim()) return "Monthly salary/income is required.";
    if (!collateralFile) return "Collateral attachment is required.";
    if (!form.bankName.trim()) return "Bank name is required.";
    if (!form.accountHolderName.trim()) return "Account holder name is required.";
    if (!form.accountNumber.trim()) return "Account number is required.";
    if (!form.bankBranch.trim()) return "Bank branch is required.";
    if (!form.guarantorFullName.trim()) return "Guarantor full name is required.";
    if (!form.guarantorPhone.trim()) return "Guarantor phone is required.";
    if (!form.guarantorRelationship.trim()) return "Guarantor relationship is required.";
    if (!form.guarantorNationalId.trim()) return "Guarantor national ID is required.";
    if (!guarantorNationalIdFile) return "Guarantor national ID attachment is required.";
    if (!form.declarationAccepted) return "Please accept applicant declaration.";
    if (!form.guarantorDeclarationAccepted) return "Please accept guarantor declaration.";
    return "";
  };

  const formValidationError = validateForm();
  const isFormComplete = !formValidationError;

  const onChange = (e) => {
    const { name, value } = e.target;

    if (name === "phone") {
      updateField(name, value.replace(/\D/g, "").slice(0, 9));
      return;
    }

    if (name === "requestedAmount") {
      updateField(name, value.replace(/[^\d]/g, ""));
      return;
    }
    if (
      [
        "contractDurationYears",
        "contractDurationMonths",
        "durationWorkedYears",
        "durationWorkedMonths",
        "monthlyIncome",
        "salaryDate",
      ].includes(name)
    ) {
      const onlyDigits = value.replace(/[^\d]/g, "");
      if (name === "salaryDate") {
        updateField(name, onlyDigits.slice(0, 2));
        return;
      }
      updateField(name, onlyDigits);
      return;
    }

    if (name === "dependants") {
      const sanitized = value.replace(/[^\d]/g, "").slice(0, 2);
      updateField(name, sanitized);
      return;
    }

    updateField(name, value);
  };

  const resetForm = () => {
    setForm({
      fullName: "",
      address: "",
      phone: "",
      email: "",
      dateOfBirth: "",
      gender: "",
      maritalStatus: "",
      dependants: "",
      housingStatus: "",
      employmentStatus: "",
      borrowerType: "",
      loanProductSlug: initialSlug,
      requestedAmount: "",
      preferredTenureMonths: "",
      description: "",
      applicantNationalIdNumber: "",
      applicantOccupation: "",
      homeVillage: "",
      traditionalAuthority: "",
      residenceArea: "",
      residenceDistrict: "",
      employerNameOrBusinessAddress: "",
      businessActivityNature: "",
      jobTitle: "",
      employmentNumber: "",
      employmentType: "",
      contractDurationYears: "",
      contractDurationMonths: "",
      durationWorkedYears: "",
      durationWorkedMonths: "",
      hrContactPhone: "",
      salaryDate: "",
      monthlyIncome: "",
      bankName: "",
      accountHolderName: "",
      accountNumber: "",
      accountPhoneNumber: "",
      bankBranch: "",
      guarantorFullName: "",
      guarantorPhone: "",
      guarantorRelationship: "",
      guarantorNationalId: "",
      guarantorOccupation: "",
      guarantorHomeVillage: "",
      guarantorTA: "",
      guarantorDistrict: "",
      guarantorResidenceArea: "",
      guarantorResidenceDistrict: "",
      declarationAccepted: false,
      guarantorDeclarationAccepted: false,
    });
    setProfilePhotoFile(null);
    setApplicantNationalIdFile(null);
    setBankStatementFile(null);
    setPayslipFile(null);
    setCollateralFile(null);
    setGuarantorNationalIdFile(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSubmitting(true);
    setSubmitStage("Submitting application...");

    try {
      const normalizedEmploymentType = String(form.employmentType || "").trim().toLowerCase();
      const isBusiness = normalizedEmploymentType === "business";
      const isPrivateCompanyEmployee = normalizedEmploymentType === "private company employee";
      const isSelfEmployed = normalizedEmploymentType === "self-employed";
      const requiresEmploymentNumber = !isPrivateCompanyEmployee && !isSelfEmployed && normalizedEmploymentType !== "farmer" && !isBusiness;
      const selectedLoanName =
        mergedLoanOptions.find((item) => item.slug === form.loanProductSlug)?.name || undefined;
      const payload = {
        fullName: form.fullName,
        address: form.address,
        phone: `+265${form.phone}`,
        email: form.email,
        dateOfBirth: form.dateOfBirth,
        gender: form.gender,
        maritalStatus: form.maritalStatus,
        dependants: Number(form.dependants),
        housingStatus: form.housingStatus,
        employmentStatus: form.employmentStatus,
        borrowerType: form.borrowerType,
        loanProductSlug: form.loanProductSlug,
        ...(selectedLoanName ? { loanProductName: selectedLoanName } : {}),
        requestedAmount: Number(form.requestedAmount),
        preferredTenureMonths: Number(form.preferredTenureMonths),
        applicantNationalIdNumber: form.applicantNationalIdNumber.trim(),
        applicantOccupation: form.applicantOccupation.trim(),
        homeVillage: form.homeVillage.trim(),
        traditionalAuthority: form.traditionalAuthority.trim(),
        residenceArea: form.residenceArea.trim(),
        residenceDistrict: form.residenceDistrict.trim(),
        employerNameOrBusinessAddress: form.employerNameOrBusinessAddress.trim() || undefined,
        businessActivityNature: isBusiness ? form.businessActivityNature.trim() : undefined,
        jobTitle: isBusiness ? undefined : form.jobTitle.trim() || undefined,
        employmentNumber: requiresEmploymentNumber ? form.employmentNumber.trim() || undefined : undefined,
        employmentType: form.employmentType.trim() || form.applicantOccupation.trim(),
        contractDurationYears: isBusiness ? undefined : (form.contractDurationYears ? Number(form.contractDurationYears) : undefined),
        contractDurationMonths: isBusiness ? undefined : (form.contractDurationMonths ? Number(form.contractDurationMonths) : undefined),
        durationWorkedYears: isBusiness ? undefined : (form.durationWorkedYears ? Number(form.durationWorkedYears) : undefined),
        durationWorkedMonths: isBusiness ? undefined : (form.durationWorkedMonths ? Number(form.durationWorkedMonths) : undefined),
        hrContactPhone: isBusiness ? undefined : (form.hrContactPhone.trim() || undefined),
        salaryDate: form.salaryDate || undefined,
        monthlyIncome: Number(form.monthlyIncome || 0),
        bankName: form.bankName.trim(),
        accountHolderName: form.accountHolderName.trim(),
        accountNumber: form.accountNumber.trim(),
        accountPhoneNumber: form.accountPhoneNumber.trim(),
        branchCode: form.bankBranch.trim(),
        reference1Name: form.guarantorFullName.trim(),
        reference1Phone: form.guarantorPhone.trim(),
        guarantorRelationship: form.guarantorRelationship.trim(),
        guarantorNationalId: form.guarantorNationalId.trim(),
        guarantorOccupation: form.guarantorOccupation.trim(),
        guarantorHomeVillage: form.guarantorHomeVillage.trim(),
        guarantorTraditionalAuthority: form.guarantorTA.trim(),
        guarantorDistrict: form.guarantorDistrict.trim(),
        guarantorResidenceArea: form.guarantorResidenceArea.trim(),
        guarantorResidenceDistrict: form.guarantorResidenceDistrict.trim(),
        declarationAccepted: !!form.declarationAccepted,
        guarantorDeclarationAccepted: !!form.guarantorDeclarationAccepted,
        notes: form.description.trim(),
      };

      const formData = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        formData.append(key, String(value));
      });

      formData.append("profilePhoto", profilePhotoFile);
      formData.append("applicantNationalIdFile", applicantNationalIdFile);
      formData.append("bankStatementFile", bankStatementFile);
      if (payslipFile) formData.append("payslipFile", payslipFile);
      formData.append("collateralFile", collateralFile);
      formData.append("guarantorNationalIdFile", guarantorNationalIdFile);

      await api.post("/inquiries", formData);
      setSuccess("Inquiry submitted successfully. Our team will contact you shortly.");
      setShowSuccessModal(true);
      resetForm();
    } catch (err) {
      const backend = err?.response?.data;
      const firstDetail = Array.isArray(backend?.details) ? backend.details[0] : null;
      const detailMsg = firstDetail
        ? toFriendlyValidationMessage(firstDetail)
        : (Array.isArray(firstDetail?.errors) && firstDetail.errors[0]?.message) || "";
      const rootMsg = detailMsg || backend?.message || "Failed to submit inquiry.";
      const stagePrefix = submitStage ? `${submitStage} ` : "";
      setError(`${stagePrefix}${rootMsg}`.trim());
    } finally {
      setSubmitting(false);
      setSubmitStage("");
    }
  };

  return (
    <>
      {submitting ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-[2px]">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white px-5 py-5 shadow-2xl">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
              <p className="text-sm font-semibold text-slate-900">Your form is processing...</p>
            </div>
            <p className="mt-2 text-xs text-slate-600">
              Please do not refresh or close this page until submission completes.
            </p>
            {submitStage ? (
              <p className="mt-2 text-xs font-medium text-slate-800">
                Current step: {submitStage}
              </p>
            ) : null}
          </div>
        </div>
      ) : null}

      {showSuccessModal ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-[28px] border border-emerald-200 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.22)] sm:p-7">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600">
                  <CheckCircle2 size={28} />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
                    Inquiry Submitted
                  </p>
                  <h3 className="mt-2 text-2xl font-bold text-slate-900">
                    Your loan request has been received
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
                aria-label="Close success modal"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mt-5 text-sm leading-7 text-slate-600">
              We have received your details successfully. Our team will review your request and contact you with the next steps.
            </p>

            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600">
              Please keep your phone available. You may receive a follow-up message for KYC and profile completion.
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setShowSuccessModal(false)}
                className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Close
              </button>
              <Link
                to="/"
                className="inline-flex items-center justify-center rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      <section className="min-h-screen bg-[radial-gradient(circle_at_top,#eef4ff_0%,#f8fbff_34%,#ffffff_72%)] py-4 sm:py-6 lg:py-8">
      <div className="mx-auto w-full max-w-[1320px] px-4 sm:px-6 lg:px-8">
        <div
          className="mb-4 rounded-[24px] border bg-white/90 px-4 py-4 shadow-sm backdrop-blur sm:px-5 lg:mb-5 lg:px-6"
          style={{ borderColor: "rgba(0,45,91,0.14)" }}
        >
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Link
                to="/"
                className="inline-flex min-h-11 items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition hover:bg-slate-100"
                style={{ color: BRAND_NAVY }}
              >
                <ArrowLeft size={16} /> Back to Home
              </Link>
              <span className="hidden text-slate-300 lg:inline">|</span>
              <span className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-2 text-xs font-medium text-slate-600">
                <ShieldCheck size={15} className="text-emerald-600" />
                Public Loan Inquiry
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600">
              <span className="inline-flex items-center gap-1">
                <PhoneCall size={14} /> +265 997 031 941
              </span>
            </div>
          </div>
        </div>

        <div>
          <div
            className="rounded-[28px] border bg-white p-4 shadow-[0_18px_60px_rgba(2,12,27,0.07)] sm:p-5 lg:p-6"
            style={{ borderColor: "rgba(0,45,91,0.14)" }}
          >
            <div className="max-w-3xl">
              <h2 className="text-2xl font-bold text-slate-900 sm:text-[2rem]">
                Apply for a Loan
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Fill in the form below and submit your loan request.
              </p>
            </div>

            {error ? (
              <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
                {error}
              </div>
            ) : null}
            {success ? (
              <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            ) : null}

            <form className="mt-5 space-y-5" onSubmit={onSubmit}>
              <div className="grid gap-5 xl:grid-cols-2">
                <section className="rounded-[24px] border border-slate-200 bg-gradient-to-b from-slate-50/70 to-white p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Contact Information
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="md:col-span-2">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</span>
                      <input
                        required
                        name="fullName"
                        value={form.fullName}
                        onChange={onChange}
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
                        placeholder="Your full name"
                      />
                    </label>

                    <label className="md:col-span-2">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Address</span>
                      <input
                        required
                        name="address"
                        value={form.address}
                        onChange={onChange}
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
                        placeholder="Your current address"
                      />
                    </label>

                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Phone</span>
                      <div className="flex overflow-hidden rounded-xl border border-slate-300 bg-white">
                        <span className="inline-flex items-center border-r border-slate-300 bg-slate-50 px-4 text-sm font-semibold text-slate-700">
                          +265
                        </span>
                        <input
                          required
                          name="phone"
                          value={form.phone}
                          onChange={onChange}
                          className="h-12 w-full px-4 text-sm outline-none"
                          placeholder="881234567"
                          inputMode="numeric"
                          maxLength={9}
                        />
                      </div>
                    </label>

                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Email</span>
                      <input
                        required
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={onChange}
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
                        placeholder="you@example.com"
                      />
                    </label>
                  </div>
                </section>

                <section className="rounded-[24px] border border-slate-200 bg-gradient-to-b from-slate-50/70 to-white p-4 sm:p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                    Loan Request
                  </p>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="md:col-span-2">
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Loan Type</span>
                      <select
                        required
                        name="loanProductSlug"
                        value={form.loanProductSlug}
                        onChange={onChange}
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
                        disabled={loadingProducts}
                      >
                        <option value="">
                          {loadingProducts ? "Loading products..." : "Select loan product"}
                        </option>
                        {mergedLoanOptions.map((item) => (
                          <option key={item.slug} value={item.slug}>
                            {item.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Loan Amount</span>
                      <input
                        required
                        name="requestedAmount"
                        value={form.requestedAmount}
                        onChange={onChange}
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
                        placeholder="Enter loan amount"
                        inputMode="numeric"
                      />
                    </label>

                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Tenure (Months)</span>
                      <select
                        required
                        name="preferredTenureMonths"
                        value={form.preferredTenureMonths}
                        onChange={onChange}
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
                      >
                        <option value="">Select tenure</option>
                        {Array.from({ length: 12 }, (_, index) => index + 1).map((month) => (
                          <option key={month} value={month}>
                            {month} {month === 1 ? "month" : "months"}
                          </option>
                        ))}
                      </select>
                    </label>

                  </div>
                </section>
              </div>

              <section className="rounded-[24px] border border-slate-200 bg-gradient-to-b from-slate-50/70 to-white p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Personal Details
                </p>

                <div className="mt-4 grid gap-4 lg:grid-cols-2">
                  <label>
                    <span className="mb-1.5 flex items-baseline gap-1.5 border-b border-slate-200 pb-2 text-sm font-semibold text-slate-900">
                      Date of Birth
                      <span className="text-xs font-medium italic text-orange-500">(Required)</span>
                    </span>
                    <input
                      required
                      type="date"
                      name="dateOfBirth"
                      value={form.dateOfBirth}
                      onChange={onChange}
                      className="mt-3 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
                    />
                  </label>

                  <label>
                    <span className="mb-1.5 flex items-baseline gap-1.5 border-b border-slate-200 pb-2 text-sm font-semibold text-slate-900">
                      No. of Dependants
                      <span className="text-xs font-medium italic text-orange-500">(Required)</span>
                    </span>
                    <input
                      required
                      name="dependants"
                      value={form.dependants}
                      onChange={onChange}
                      inputMode="numeric"
                      className="mt-3 h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
                      placeholder="Enter number of dependants"
                    />
                  </label>
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-2">
                  <ChoiceGrid
                    label="Gender"
                    name="gender"
                    value={form.gender}
                    onChange={updateField}
                    options={GENDER_OPTIONS}
                    columns={1}
                  />

                  <ChoiceGrid
                    label="Marital Status"
                    name="maritalStatus"
                    value={form.maritalStatus}
                    onChange={updateField}
                    options={[
                      { value: "single", label: "Single" },
                      { value: "married", label: "Married" },
                      { value: "divorced", label: "Others" },
                    ]}
                    columns={1}
                  />
                </div>

                <div className="mt-5 grid gap-5 xl:grid-cols-2">
                  <ChoiceGrid
                    label="Housing Status"
                    name="housingStatus"
                    value={form.housingStatus}
                    onChange={updateField}
                    options={HOUSING_OPTIONS}
                    columns={1}
                  />

                  <ChoiceGrid
                    label="Employment Status"
                    name="employmentStatus"
                    value={form.employmentStatus}
                    onChange={updateField}
                    options={[
                      { value: "employed", label: "Yes" },
                      { value: "not_employed", label: "No" },
                    ]}
                    columns={1}
                  />
                </div>

                <div className="mt-5">
                  <ChoiceGrid
                    label="Borrower Type"
                    name="borrowerType"
                    value={form.borrowerType}
                    onChange={updateField}
                    options={BORROWER_OPTIONS}
                    hint="Choose whether this is your first loan with us or a repeat request."
                  />
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-gradient-to-b from-slate-50/70 to-white p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  PART 1: Applicant Personal Details
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">National ID Number</span>
                    <input name="applicantNationalIdNumber" value={form.applicantNationalIdNumber} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter national ID number" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Occupation</span>
                    <input name="applicantOccupation" value={form.applicantOccupation} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter occupation" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Home Village</span>
                    <input name="homeVillage" value={form.homeVillage} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter home village" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">T/A</span>
                    <input name="traditionalAuthority" value={form.traditionalAuthority} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter Traditional Authority (T/A)" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Residence Area</span>
                    <input name="residenceArea" value={form.residenceArea} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter residence area" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Residence District</span>
                    <input name="residenceDistrict" value={form.residenceDistrict} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter residence district" />
                  </label>
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  PART 2: Employment / Business Details
                </p>
                {(() => {
                  const normalizedEmploymentType = String(form.employmentType || "").trim().toLowerCase();
                  const isGovernmentEmployee = normalizedEmploymentType === "government employee";
                  const isPrivateCompanyEmployee = normalizedEmploymentType === "private company employee";
                  const isSelfEmployed = normalizedEmploymentType === "self-employed";
                  const isFarmer = normalizedEmploymentType === "farmer";
                  const isBusiness = normalizedEmploymentType === "business";
                  const requiresSalaryDate =
                    isGovernmentEmployee || isPrivateCompanyEmployee || isSelfEmployed;

                  return (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Employment Type</span>
                    <select
                      required
                      name="employmentType"
                      value={form.employmentType}
                      onChange={onChange}
                      className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
                    >
                      <option value="">Select employment type</option>
                      {EMPLOYMENT_TYPE_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="md:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Employer / Business Address</span>
                    <input
                      name="employerNameOrBusinessAddress"
                      value={form.employerNameOrBusinessAddress}
                      onChange={onChange}
                      className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
                      placeholder={isBusiness ? "Enter business full address" : "Enter employer full address"}
                    />
                  </label>

                  {isBusiness ? (
                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Nature of Business Activity</span>
                      <select
                        name="businessActivityNature"
                        value={form.businessActivityNature}
                        onChange={onChange}
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
                      >
                        <option value="">Select nature of business activity</option>
                        {BUSINESS_NATURE_OPTIONS.map((option) => (
                          <option key={option} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </label>
                  ) : null}

                  {!isBusiness && !isFarmer ? (
                    <>
                      <label>
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">Job Title</span>
                        <input name="jobTitle" value={form.jobTitle} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter job title" />
                      </label>
                      {!isPrivateCompanyEmployee && !isSelfEmployed ? (
                        <label>
                          <span className="mb-1.5 block text-sm font-medium text-slate-700">Employment Number</span>
                          <input name="employmentNumber" value={form.employmentNumber} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter employment number" />
                        </label>
                      ) : null}
                      <label>
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">Duration Worked Years</span>
                        <input name="durationWorkedYears" value={form.durationWorkedYears} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter years worked" />
                      </label>
                      <label>
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">Duration Worked Months</span>
                        <input name="durationWorkedMonths" value={form.durationWorkedMonths} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter months worked" />
                      </label>
                      <label>
                        <span className="mb-1.5 block text-sm font-medium text-slate-700">HR Phone Number</span>
                        <input name="hrContactPhone" value={form.hrContactPhone} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter HR phone number" />
                      </label>
                    </>
                  ) : null}

                  {requiresSalaryDate ? (
                    <label>
                      <span className="mb-1.5 block text-sm font-medium text-slate-700">Date of Salary / Income</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        name="salaryDate"
                        value={form.salaryDate}
                        onChange={onChange}
                        className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
                        placeholder="Enter salary day (1-31)"
                      />
                    </label>
                  ) : null}

                  <label className="md:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Monthly Salary (NET) / Expected Monthly Income (MWK)</span>
                    <input name="monthlyIncome" value={form.monthlyIncome} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter monthly income" />
                  </label>
                </div>
                  );
                })()}
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  PART 3: Loan Amount, Collateral and Purpose
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Loan type and requested amount are captured above. Add loan purpose here.
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="md:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Loan Purpose</span>
                    <textarea
                      required
                      name="description"
                      value={form.description}
                      onChange={onChange}
                      rows={4}
                      className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm"
                      placeholder="Enter loan purpose"
                    />
                  </label>
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Bank Account Information (For Disbursement)
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Bank Name</span>
                    <input name="bankName" value={form.bankName} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter bank name" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Account Holder's Name</span>
                    <input name="accountHolderName" value={form.accountHolderName} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter account holder name" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Account Number</span>
                    <input name="accountNumber" value={form.accountNumber} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter account number" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Account Phone Number</span>
                    <input name="accountPhoneNumber" value={form.accountPhoneNumber} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter account phone number" />
                  </label>
                  <label className="md:col-span-2">
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Bank Branch</span>
                    <input name="bankBranch" value={form.bankBranch} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter bank branch" />
                  </label>
                </div>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-gradient-to-b from-slate-50/70 to-white p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  Required Documents
                </p>
                <p className="mt-2 text-sm text-slate-600">
                  Upload all required documents in this single section.
                </p>
                {(() => {
                  const normalizedEmploymentType = String(form.employmentType || "").trim().toLowerCase();
                  const isSelfEmployed = normalizedEmploymentType === "self-employed";
                  const isFarmer = normalizedEmploymentType === "farmer";
                  const showPayslip = !(isSelfEmployed || isFarmer);
                  return (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="h-full rounded-2xl border border-slate-200 bg-white p-4">
                    <span className="block text-sm font-semibold text-slate-800">Profile Photo</span>
                    <span className="mt-1 block text-xs text-slate-500">JPG or PNG, clear face image</span>
                    <input
                      required
                      type="file"
                      accept=".jpg,.jpeg,.png"
                      onChange={(e) => setProfilePhotoFile(e.target.files?.[0] || null)}
                      className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                    />
                    <span className="mt-2 block text-xs text-slate-600">{profilePhotoFile?.name || "No file selected"}</span>
                    {profilePhotoFile ? (
                      <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Uploaded successfully
                      </span>
                    ) : null}
                  </label>

                  <label className="h-full rounded-2xl border border-slate-200 bg-white p-4">
                    <span className="block text-sm font-semibold text-slate-800">Applicant National ID</span>
                    <span className="mt-1 block text-xs text-slate-500">PDF, JPG, JPEG, or PNG</span>
                    <input
                      required
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setApplicantNationalIdFile(e.target.files?.[0] || null)}
                      className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                    />
                    <span className="mt-2 block text-xs text-slate-600">{applicantNationalIdFile?.name || "No file selected"}</span>
                    {applicantNationalIdFile ? (
                      <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Uploaded successfully
                      </span>
                    ) : null}
                  </label>

                  <label className="h-full rounded-2xl border border-slate-200 bg-white p-4">
                    <span className="block text-sm font-semibold text-slate-800">Bank Statement (3 Months)</span>
                    <span className="mt-1 block text-xs text-slate-500">PDF, JPG, JPEG, or PNG</span>
                    <input
                      required
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setBankStatementFile(e.target.files?.[0] || null)}
                      className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                    />
                    <span className="mt-2 block text-xs text-slate-600">{bankStatementFile?.name || "No file selected"}</span>
                    {bankStatementFile ? (
                      <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Uploaded successfully
                      </span>
                    ) : null}
                  </label>

                  <label className="h-full rounded-2xl border border-slate-200 bg-white p-4">
                    <span className="block text-sm font-semibold text-slate-800">Collateral </span>
                    <span className="mt-1 block text-xs text-slate-500">PDF, JPG, JPEG, or PNG</span>
                    <input
                      required
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setCollateralFile(e.target.files?.[0] || null)}
                      className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                    />
                    <span className="mt-2 block text-xs text-slate-600">{collateralFile?.name || "No file selected"}</span>
                    {collateralFile ? (
                      <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Uploaded successfully
                      </span>
                    ) : null}
                  </label>

                  {showPayslip ? (
                    <label className="h-full rounded-2xl border border-slate-200 bg-white p-4">
                      <span className="block text-sm font-semibold text-slate-800">Payslip / Business Proof</span>
                      <span className="mt-1 block text-xs text-slate-500">PDF, JPG, JPEG, or PNG</span>
                      <input
                        required
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => setPayslipFile(e.target.files?.[0] || null)}
                        className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                      />
                      <span className="mt-2 block text-xs text-slate-600">{payslipFile?.name || "No file selected"}</span>
                      {payslipFile ? (
                        <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                          Uploaded successfully
                        </span>
                      ) : null}
                    </label>
                  ) : null}

                  <label className="h-full rounded-2xl border border-slate-200 bg-white p-4">
                    <span className="block text-sm font-semibold text-slate-800">Guarantor National ID</span>
                    <span className="mt-1 block text-xs text-slate-500">PDF, JPG, JPEG, or PNG</span>
                    <input
                      required
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => setGuarantorNationalIdFile(e.target.files?.[0] || null)}
                      className="mt-3 block w-full rounded-xl border border-slate-300 bg-white px-3 py-3 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
                    />
                    <span className="mt-2 block text-xs text-slate-600">{guarantorNationalIdFile?.name || "No file selected"}</span>
                    {guarantorNationalIdFile ? (
                      <span className="mt-1 inline-block rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                        Uploaded successfully
                      </span>
                    ) : null}
                  </label>
                </div>
                  );
                })()}
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  PART 4: Declaration by Loan Applicant
                </p>
                <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                  <p>
                    I, the undersigned, declare that all information in this application is true and correct, and I agree to all obligations arising from the Alinafe Capital client relationship.
                  </p>
                  <p className="mt-2">
                    I understand that if this loan is approved, I will be personally liable to repay the full amount, and I consent to credit/reference checks with relevant institutions.
                  </p>
                  <p className="mt-2">
                    I consent to provide true proof of income, proof of residence, National ID/official ID, and employer/collateral proof as required for processing.
                  </p>
                  <p className="mt-2">
                    I consent to court jurisdiction for claims under this agreement.
                  </p>
                </div>
                <label className="mt-3 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <input type="checkbox" checked={form.declarationAccepted} onChange={(e) => updateField("declarationAccepted", e.target.checked)} className="mt-0.5 h-4 w-4" />
                  <span>I confirm that all applicant details and declarations are true and accepted.</span>
                </label>
              </section>

              <section className="rounded-[24px] border border-slate-200 bg-white p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
                  PART 5: Guarantor / Witness
                </p>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Full Name</span>
                    <input name="guarantorFullName" value={form.guarantorFullName} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter guarantor full name" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Phone Number</span>
                    <input name="guarantorPhone" value={form.guarantorPhone} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="e.g. +265 99X XXX XXX" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Relationship</span>
                    <select
                      name="guarantorRelationship"
                      value={form.guarantorRelationship}
                      onChange={onChange}
                      className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm"
                    >
                      <option value="">Select relationship</option>
                      {GUARANTOR_RELATIONSHIP_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">National ID Number</span>
                    <input name="guarantorNationalId" value={form.guarantorNationalId} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter national ID number" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Occupation</span>
                    <input name="guarantorOccupation" value={form.guarantorOccupation} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="e.g. Teacher / Business Owner / Farmer" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Home Village</span>
                    <input name="guarantorHomeVillage" value={form.guarantorHomeVillage} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter guarantor home village" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">T/A</span>
                    <input name="guarantorTA" value={form.guarantorTA} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="Enter Traditional Authority (T/A)" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">District</span>
                    <input name="guarantorDistrict" value={form.guarantorDistrict} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="e.g. Lilongwe" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Residence Area</span>
                    <input name="guarantorResidenceArea" value={form.guarantorResidenceArea} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="e.g. Area 25" />
                  </label>
                  <label>
                    <span className="mb-1.5 block text-sm font-medium text-slate-700">Residence District</span>
                    <input name="guarantorResidenceDistrict" value={form.guarantorResidenceDistrict} onChange={onChange} className="h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm" placeholder="e.g. Lilongwe" />
                  </label>
                </div>

                <label className="mt-4 flex items-start gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
                  <input type="checkbox" checked={form.guarantorDeclarationAccepted} onChange={(e) => updateField("guarantorDeclarationAccepted", e.target.checked)} className="mt-0.5 h-4 w-4" />
                  <span>I confirm guarantor declaration and liability terms.</span>
                </label>

                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                  FOR GUARANTOR USE ONLY: I agree to act as guarantor for this loan and understand I will be liable if the applicant defaults.
                </div>
              </section>

              <div className="flex flex-col gap-4 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="max-w-2xl text-sm leading-6 text-slate-600">
                  Once you submit, your inquiry goes directly to our admin team for review.
                </p>
                <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                  <button
                    type="submit"
                    disabled={submitting || !isFormComplete}
                    title={!isFormComplete ? formValidationError : ""}
                    className="w-full rounded-xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60 sm:w-auto"
                  >
                    {submitting ? "Submitting..." : "Submit"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
    </>
  );
}
