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
  processingFeeType = "percent",
  processingFeeFlat = 0,
  adminFeeType = "flat",
  adminFeeRate = 0,
  adminFeeFlat = 0,
  monthlyAdminFee = 0,
}) {
  const processingFee = processingFeeEnabled
    ? processingFeeType === "flat"
      ? Number(processingFeeFlat || 0)
      : principal * processingFeeRate
    : 0;
  const oneTimeAdminFee =
    adminFeeType === "percent"
      ? principal * Number(adminFeeRate || 0)
      : Number(adminFeeFlat || 0);

  const base =
    rateType === "reducing"
      ? calculateReducing(principal, monthlyRate, months)
      : rateType === "flat"
      ? calculateFlat(principal, monthlyRate, months)
      : calculateFeeOnly(principal, months, processingFee);

  const totalAdminFees = oneTimeAdminFee + Number(monthlyAdminFee || 0) * months;
  const totalWithFees =
    rateType === "fee_only"
      ? base.totalPayment + totalAdminFees
      : base.totalPayment + processingFee + totalAdminFees;
  const recurringMonthlyDue = base.emi + Number(monthlyAdminFee || 0);
  const firstMonthDue =
    recurringMonthlyDue +
    Number(oneTimeAdminFee || 0) +
    (rateType === "fee_only" ? 0 : Number(processingFee || 0));

  return {
    ...base,
    processingFee,
    oneTimeAdminFee,
    monthlyAdminFee: Number(monthlyAdminFee || 0),
    totalAdminFees,
    monthlyDue: recurringMonthlyDue,
    firstMonthDue,
    totalWithFees,
  };
}

export function generateSchedule(
  principal,
  rate,
  months,
  rateType,
  processingFee = 0,
  monthlyAdminFee = 0,
  oneTimeAdminFee = 0
) {
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
      monthlyDue:
        emi +
        Number(monthlyAdminFee || 0) +
        (i === 1
          ? Number(oneTimeAdminFee || 0) + (rateType === "fee_only" ? 0 : Number(processingFee || 0))
          : 0),
      principalPaid,
      interest,
      adminFee: Number(monthlyAdminFee || 0) + (i === 1 ? Number(oneTimeAdminFee || 0) : 0),
      processingFee: i === 1 && rateType !== "fee_only" ? Number(processingFee || 0) : 0,
      balance: balance > 0 ? balance : 0,
    });
  }

  return schedule;
}
