import { ApiError } from "../utils/ApiError.js";

const calculateFee = (type, value, principal) => {
  const safeValue = Number(value || 0);
  if (type === "flat") return safeValue;
  if (type === "percent") return (principal * safeValue) / 100;
  return 0;
};

export const emiCalculatorService = {
  calculate({ product, amount, tenureMonths }) {
    if (amount < product.minAmount || amount > product.maxAmount) {
      throw new ApiError(400, "Amount outside allowed range", "INVALID_AMOUNT");
    }

    if (
      tenureMonths < product.minTenureMonths ||
      tenureMonths > product.maxTenureMonths
    ) {
      throw new ApiError(400, "Tenure outside allowed range", "INVALID_TENURE");
    }

    const monthlyRate = Number(product.interestRateMonthly || 0) / 100;
    let emi = 0;
    let totalInterest = 0;

    if (product.interestType === "flat") {
      totalInterest = amount * monthlyRate * tenureMonths;
      emi = (amount + totalInterest) / tenureMonths;
    }

    if (product.interestType === "reducing") {
      const r = monthlyRate;
      const n = tenureMonths;

      if (r === 0) {
        emi = amount / n;
      } else {
        emi =
          (amount * r * Math.pow(1 + r, n)) /
          (Math.pow(1 + r, n) - 1);
      }

      totalInterest = emi * tenureMonths - amount;
    }

    // Processing and administration charges are ONE-TIME upfront fees.
    // They are not repeated in monthly installments/calculator periods.
    const processingFee = calculateFee(
      product.processingFeeType || "percent",
      product.processingFeeValue ?? 2.5,
      amount
    );
    const adminFee = calculateFee(
      product.adminFeeType || "percent",
      product.adminFeeValue ?? 2.5,
      amount
    );

    let insurance = 0;
    if (product.insuranceType === "flat") {
      insurance = Number(product.insuranceValue || 0);
    } else if (product.insuranceType === "percent") {
      insurance = (amount * Number(product.insuranceValue || 0)) / 100;
    }

    const tax = ((processingFee + insurance) * Number(product.taxRatePercent || 0)) / 100;
    const totalPayable = amount + totalInterest + processingFee + adminFee + insurance + tax;

    return {
      principal: amount,
      emi: Number(emi.toFixed(2)),
      totalInterest: Number(totalInterest.toFixed(2)),
      processingFee: Number(processingFee.toFixed(2)),
      adminFee: Number(adminFee.toFixed(2)),
      // Legacy response keys retained so older clients do not break.
      loanAdministrationFeeMonthly: 0,
      loanAdministrationFeeTotal: 0,
      insurance: Number(insurance.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      totalPayable: Number(totalPayable.toFixed(2)),
      interestType: product.interestType,
      overduePenaltyRatePercent: Number(product.overduePenaltyRatePercent ?? 15),
      feePolicy: "Processing fee and administration fee are one-time charges applied at the beginning of the loan.",
    };
  },
};
