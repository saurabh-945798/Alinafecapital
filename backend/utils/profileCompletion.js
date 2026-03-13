export function calculateProfileCompletion(profile = {}) {
  const hasText = (value) => typeof value === "string" && value.trim().length > 0;
  const hasNumber = (value) => typeof value === "number" && Number.isFinite(value) && value > 0;

  let score = 0;

  // Identity: 30
  if (hasText(profile.fullName) && hasText(profile.email) && hasText(profile.phone)) {
    score += 30;
  }

  // Address: 25
  if (hasText(profile.addressLine1) && hasText(profile.city) && hasText(profile.district)) {
    score += 25;
  }

  // Income: 20
  if (hasText(profile.employmentType) && hasNumber(profile.monthlyIncome)) {
    score += 15;
  }

  // Banking details: 15
  if (hasText(profile.bankName) && hasText(profile.accountNumber) && hasText(profile.branchCode)) {
    score += 15;
  }

  // Documents: 25 (all required)
  const docs = Array.isArray(profile.documents) ? profile.documents : [];
  const docTypes = new Set(docs.map((d) => d?.type));
  const employmentType = String(profile.employmentType || "").trim().toLowerCase();
  const usesTwoDocumentFlow =
    employmentType === "farmer" || employmentType === "self-employed";
  if (
    docTypes.has("national_id") &&
    docTypes.has("bank_statement_3_months") &&
    (usesTwoDocumentFlow || docTypes.has("payslip_or_business_proof"))
  ) {
    score += 25;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
