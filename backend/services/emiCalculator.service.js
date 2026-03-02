import { ApiError } from "../utils/ApiError.js";

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

    const monthlyRate = product.interestRateMonthly / 100;
    let emi = 0;
    let totalInterest = 0;

    // FLAT INTEREST
    if (product.interestType === "flat") {
      totalInterest = amount * monthlyRate * tenureMonths;
      emi = (amount + totalInterest) / tenureMonths;
    }

    // REDUCING BALANCE (EMI formula)
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

    // Processing Fee
    let processingFee = 0;
    if (product.processingFeeType === "flat") {
      processingFee = product.processingFeeValue;
    } else if (product.processingFeeType === "percent") {
      processingFee = (amount * product.processingFeeValue) / 100;
    }

    // Insurance
    let insurance = 0;
    if (product.insuranceType === "flat") {
      insurance = product.insuranceValue;
    } else if (product.insuranceType === "percent") {
      insurance = (amount * product.insuranceValue) / 100;
    }

    // Tax on fees
    const tax = ((processingFee + insurance) * product.taxRatePercent) / 100;

    const totalPayable =
      amount + totalInterest + processingFee + insurance + tax;

    return {
      principal: amount,
      emi: Number(emi.toFixed(2)),
      totalInterest: Number(totalInterest.toFixed(2)),
      processingFee: Number(processingFee.toFixed(2)),
      insurance: Number(insurance.toFixed(2)),
      tax: Number(tax.toFixed(2)),
      totalPayable: Number(totalPayable.toFixed(2)),
      interestType: product.interestType,
    };
  },
};