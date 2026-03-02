export const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export function calculateReducing(principal, monthlyRate, months) {
  if (principal <= 0 || months <= 0 || monthlyRate <= 0) {
    return { emi: 0, totalPayment: 0, totalInterest: 0 };
  }

  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) /
    (Math.pow(1 + monthlyRate, months) - 1);

  const totalPayment = emi * months;
  const totalInterest = totalPayment - principal;

  return { emi, totalPayment, totalInterest };
}

export function calculateFlat(principal, monthlyRate, months) {
  if (principal <= 0 || months <= 0 || monthlyRate < 0) {
    return { emi: 0, totalPayment: 0, totalInterest: 0 };
  }

  const totalInterest = principal * monthlyRate * months;
  const totalPayment = principal + totalInterest;
  const emi = totalPayment / months;

  return { emi, totalPayment, totalInterest };
}

export function calculateFeeOnly(principal, months, processingFee) {
  if (principal <= 0 || months <= 0) {
    return { emi: 0, totalPayment: 0, totalInterest: 0 };
  }

  const totalPayment = principal + processingFee;
  const emi = totalPayment / months;

  return { emi, totalPayment, totalInterest: 0 };
}

export function calculateQuote({
  principal,
  months,
  rateType,
  monthlyRate,
  processingFeeEnabled,
  processingFeeRate,
}) {
  const processingFee = processingFeeEnabled ? principal * processingFeeRate : 0;

  const base =
    rateType === "reducing"
      ? calculateReducing(principal, monthlyRate, months)
      : rateType === "flat"
      ? calculateFlat(principal, monthlyRate, months)
      : calculateFeeOnly(principal, months, processingFee);

  const totalWithFees =
    rateType === "fee_only" ? base.totalPayment : base.totalPayment + processingFee;

  return {
    ...base,
    processingFee,
    totalWithFees,
  };
}

export function generateSchedule(principal, rate, months, rateType, processingFee = 0) {
  const schedule = [];

  const { emi } =
    rateType === "reducing"
      ? calculateReducing(principal, rate, months)
      : rateType === "flat"
      ? calculateFlat(principal, rate, months)
      : calculateFeeOnly(principal, months, processingFee);

  let balance = principal;

  for (let i = 1; i <= months; i++) {
    const interest =
      rateType === "reducing"
        ? balance * rate
        : rateType === "flat"
        ? principal * rate
        : 0;

    const principalPaid = Math.max(0, emi - interest);
    balance -= principalPaid;

    schedule.push({
      month: i,
      emi,
      principalPaid,
      interest,
      balance: balance > 0 ? balance : 0,
    });
  }

  return schedule;
}
