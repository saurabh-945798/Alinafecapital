export function getKycGate(profile) {
  const completion = profile?.profileCompletion ?? 0;
  const kycStatus = profile?.kycStatus ?? "not_started";
  const remarks = profile?.kycRemarks?.trim?.() || "";

  const canApply = completion === 100 && kycStatus === "verified";
  const needsProfile = completion < 100;
  const needsSubmit = completion === 100 && kycStatus === "not_started";
  const pending = kycStatus === "pending";
  const rejected = kycStatus === "rejected";

  let blockReason = "";
  if (needsProfile) blockReason = "Complete your profile to apply.";
  else if (needsSubmit) blockReason = "Submit KYC to apply.";
  else if (pending) blockReason = "KYC is under review.";
  else if (rejected) {
    blockReason = remarks
      ? `KYC rejected: ${remarks}. Please re-upload documents and resubmit.`
      : "KYC rejected. Please re-upload documents and resubmit.";
  }

  return {
    completion,
    kycStatus,
    canApply,
    blockReason,
    needsProfile,
    needsSubmit,
    pending,
    rejected,
  };
}

