export const LOAN_FEE_POLICY = Object.freeze({
  processingFeeType: "percent",
  processingFeeValue: 2.5,
  adminFeeType: "percent",
  adminFeeValue: 2.5,
  overduePenaltyRatePercent: 15,
});

const asPlainObject = (product) =>
  product?.toObject ? product.toObject() : { ...(product || {}) };

export const withCurrentLoanFeePolicy = (product) => {
  const item = asPlainObject(product);
  return {
    ...item,
    processingFeeType: "percent",
    processingFeeValue: LOAN_FEE_POLICY.processingFeeValue,
    adminFeeType: "percent",
    adminFeeValue: LOAN_FEE_POLICY.adminFeeValue,
    loanAdministrationFeeMonthly: 0,
    overduePenaltyRatePercent: LOAN_FEE_POLICY.overduePenaltyRatePercent,
  };
};

export const applyCurrentLoanFeePolicyToPayload = (payload = {}) => ({
  ...payload,
  processingFeeType: "percent",
  processingFeeValue: LOAN_FEE_POLICY.processingFeeValue,
  adminFeeType: "percent",
  adminFeeValue: LOAN_FEE_POLICY.adminFeeValue,
  loanAdministrationFeeMonthly: 0,
  overduePenaltyRatePercent: LOAN_FEE_POLICY.overduePenaltyRatePercent,
});
