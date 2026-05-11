export function calculateProfileCompletion(profile = {}) {
  const hasText = (value) => typeof value === "string" && value.trim().length > 0;
  const hasNumber = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;
  const hasNonNegativeNumber = (value) =>
    typeof value === "number" && Number.isFinite(value) && value >= 0;
  const firstText = (...values) => {
    for (const value of values) {
      if (hasText(value)) return String(value).trim();
    }
    return "";
  };

  let score = 0;

  // Identity: 30
  if (
    hasText(profile.fullName) &&
    hasText(profile.email) &&
    hasText(profile.phone) &&
    hasText(profile.avatarUrl)
  ) {
    score += 30;
  }

  // Address: 25
  // Support both legacy profile fields and new single-form inquiry fields.
  const addressLine = firstText(profile.addressLine1, profile.address);
  const districtValue = firstText(profile.district, profile.residenceDistrict);
  if (hasText(addressLine) && hasText(districtValue)) {
    score += 25;
  }

  // Income: 20
  const employmentType = String(profile.employmentType || "").trim().toLowerCase();
  const isBusiness = employmentType === "business";
  const isFarmer = employmentType === "farmer";
  const isPrivateCompanyEmployee = employmentType === "private company employee";
  const isSelfEmployed = employmentType === "self-employed";
  const requiresGovernmentId = employmentType === "government employee";
  const requiresSalaryDate =
    employmentType === "government employee" ||
    isPrivateCompanyEmployee ||
    isSelfEmployed;
  const employmentStatus = String(profile.employmentStatus || "").trim().toLowerCase();
  const requiresContractDuration = employmentStatus === "fixed_contract";

  const hasEmploymentCore = isBusiness
    ? hasText(firstText(profile.businessName, profile.employerNameOrBusinessAddress)) &&
      hasText(profile.businessActivityNature)
    : isFarmer
    ? true
    : hasText(profile.jobTitle) &&
      (isPrivateCompanyEmployee || isSelfEmployed || hasText(profile.employmentNumber)) &&
      hasText(profile.employmentStatus) &&
      (!requiresContractDuration ||
        (hasNonNegativeNumber(profile.contractDurationYears) &&
          hasNonNegativeNumber(profile.contractDurationMonths))) &&
      hasNonNegativeNumber(profile.durationWorkedYears) &&
      hasNonNegativeNumber(profile.durationWorkedMonths) &&
      hasText(profile.hrContactPhone);

  if (
    hasText(profile.employmentType) &&
    hasEmploymentCore &&
    hasNumber(profile.monthlyIncome) &&
    (!requiresGovernmentId ||
      hasText(firstText(profile.governmentId, profile.applicantNationalIdNumber))) &&
    (!requiresSalaryDate || hasText(profile.salaryDate))
  ) {
    score += 15;
  }

  // Banking details: 15
  if (hasText(profile.bankName) && hasText(profile.accountNumber) && hasText(profile.branchCode)) {
    score += 15;
  }

  // Documents: 25 (all required)
  const docs = Array.isArray(profile.documents) ? profile.documents : [];
  const docTypes = new Set(docs.map((d) => d?.type));
  const usesTwoDocumentFlow =
    employmentType === "farmer" || employmentType === "self-employed";
  if (
    docTypes.has("national_id") &&
    docTypes.has("bank_statement_3_months") &&
    docTypes.has("security_offer") &&
    (usesTwoDocumentFlow || docTypes.has("payslip_or_business_proof"))
  ) {
    score += 25;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
