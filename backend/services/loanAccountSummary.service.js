const roundAmount = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.round(amount * 1000) / 1000 : 0;
};

const isEffectivelyZero = (value) => Math.abs(Number(value || 0)) <= 0.0005;

const calculateReducingInstallment = (principal, monthlyRate, months) => {
  if (principal <= 0 || months <= 0) return 0;
  if (monthlyRate <= 0) return principal / months;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
};

const addMonths = (value, monthsToAdd) => {
  const date = new Date(value || new Date());
  if (Number.isNaN(date.getTime())) return null;
  date.setMonth(date.getMonth() + monthsToAdd);
  return date;
};

const calculateFee = (type, value, principal) => {
  const safeValue = Number(value || 0);
  if (type === "flat") return roundAmount(safeValue);
  if (type === "percent") return roundAmount((principal * safeValue) / 100);
  return 0;
};

const hasProductPricingSnapshot = (account) =>
  Boolean(account?.interestType) ||
  (account?.interestRateMonthly !== undefined && account?.interestRateMonthly !== null);

const hasOneTimeAdminSnapshot = (account) =>
  Boolean(account?.adminFeeType) ||
  (account?.adminFeeValue !== undefined && account?.adminFeeValue !== null);

const paymentTimestamp = (entry) => {
  const time = new Date(entry?.paymentDate || entry?.recordedAt || 0).getTime();
  return Number.isFinite(time) ? time : 0;
};

export const buildRepaymentPlan = (account) => {
  const principal = Number(account?.disbursedAmount || 0);
  const months = Number(account?.tenureMonths || 0);
  if (principal <= 0 || months <= 0) return null;

  const startDate = account?.disbursedAt || account?.approvedAt || account?.createdAt || new Date();
  const productSnapshot = hasProductPricingSnapshot(account);

  const interestType = productSnapshot ? String(account?.interestType || "reducing") : "reducing";
  const monthlyRate = productSnapshot
    ? Number(account?.interestRateMonthly || 0) / 100
    : Number(account?.monthlyRate || 0);

  const processingFee = productSnapshot
    ? calculateFee(account?.processingFeeType || "percent", account?.processingFeeValue ?? 2.5, principal)
    : roundAmount(principal * Number(account?.processingFeeRate || 0));

  const insurance = productSnapshot
    ? calculateFee(account?.insuranceType, account?.insuranceValue, principal)
    : 0;

  const tax = productSnapshot
    ? roundAmount(((processingFee + insurance) * Number(account?.taxRatePercent || 0)) / 100)
    : 0;

  // Current policy: admin fee is charged once at the beginning, not monthly.
  // Historical accounts without the new snapshot continue to honour their stored recurring fee.
  const oneTimeAdminFee = productSnapshot && hasOneTimeAdminSnapshot(account)
    ? calculateFee(account?.adminFeeType || "percent", account?.adminFeeValue ?? 2.5, principal)
    : 0;
  const historicalMonthlyAdminFee = productSnapshot && !hasOneTimeAdminSnapshot(account)
    ? roundAmount(account?.loanAdministrationFeeMonthly || 0)
    : 0;
  const legacyAdminFee = productSnapshot ? 0 : roundAmount(principal * Number(account?.adminFeeRate || 0));

  const oneTimeFees = roundAmount(processingFee + oneTimeAdminFee + insurance + tax + legacyAdminFee);

  const baseInstallment =
    interestType === "flat"
      ? (principal + principal * monthlyRate * months) / months
      : calculateReducingInstallment(principal, monthlyRate, months);

  let balance = roundAmount(principal);
  const schedule = [];

  for (let month = 1; month <= months; month += 1) {
    const openingBalance = balance;
    const interest = roundAmount(
      interestType === "flat" ? principal * monthlyRate : openingBalance * monthlyRate
    );
    let principalPaid = roundAmount(
      interestType === "flat" ? principal / months : Math.max(0, baseInstallment - interest)
    );
    if (month === months || principalPaid > openingBalance) principalPaid = roundAmount(openingBalance);
    balance = roundAmount(Math.max(0, openingBalance - principalPaid));

    const fees = roundAmount(historicalMonthlyAdminFee + (month === 1 ? oneTimeFees : 0));
    const installment = roundAmount(principalPaid + interest + fees);

    schedule.push({
      month,
      dueDate: addMonths(startDate, month),
      installment,
      openingBalance: roundAmount(openingBalance),
      principalPaid,
      interest,
      fees,
      adminFee: month === 1 ? roundAmount(oneTimeAdminFee + legacyAdminFee) : 0,
      processingFee: month === 1 ? processingFee : 0,
      closingBalance: roundAmount(balance),
    });
  }

  const totalInterest = roundAmount(schedule.reduce((sum, row) => sum + row.interest, 0));
  const historicalAdministrationFeeTotal = roundAmount(historicalMonthlyAdminFee * months);
  const totalRepayment = roundAmount(schedule.reduce((sum, row) => sum + row.installment, 0));

  return {
    schedule,
    totalRepayment,
    monthlyInstallment: roundAmount(baseInstallment + historicalMonthlyAdminFee),
    firstInstallment: roundAmount(schedule[0]?.installment || baseInstallment),
    processingFee,
    adminFee: roundAmount(oneTimeAdminFee + legacyAdminFee),
    loanAdministrationFeeMonthly: historicalMonthlyAdminFee,
    loanAdministrationFeeTotal: historicalAdministrationFeeTotal,
    insurance,
    tax,
    totalInterest,
    interestType,
    overduePenaltyRatePercent: Number(account?.overduePenaltyRatePercent ?? 15),
  };
};

const determinePenaltyEligibility = ({ schedule, entries, now, penaltyRatePercent }) => {
  // Penalty is applied once per installment when the installment was not fully cleared by its due date.
  // We calculate the unpaid scheduled amount at the due date using payments actually recorded on/before that date.
  const penalties = new Map();
  let cumulativeBaseDue = 0;

  for (const row of schedule) {
    cumulativeBaseDue = roundAmount(cumulativeBaseDue + Number(row.installment || 0));
    const dueTime = row?.dueDate ? new Date(row.dueDate).getTime() : Number.NaN;
    if (!Number.isFinite(dueTime) || dueTime >= now.getTime()) {
      penalties.set(row.month, { penaltyAmount: 0, penaltyBaseAmount: 0 });
      continue;
    }

    const paidByDue = roundAmount(
      entries
        .filter((entry) => paymentTimestamp(entry) <= dueTime)
        .reduce((sum, entry) => sum + Number(entry?.amount || 0), 0)
    );

    const previousBaseDue = roundAmount(cumulativeBaseDue - Number(row.installment || 0));
    const paidTowardThisInstallmentByDue = Math.max(
      0,
      Math.min(Number(row.installment || 0), paidByDue - previousBaseDue)
    );
    const unpaidAtDue = roundAmount(
      Math.max(0, Number(row.installment || 0) - paidTowardThisInstallmentByDue)
    );
    const penaltyAmount = unpaidAtDue > 0
      ? roundAmount((unpaidAtDue * Number(penaltyRatePercent || 0)) / 100)
      : 0;

    penalties.set(row.month, {
      penaltyAmount,
      penaltyBaseAmount: unpaidAtDue,
    });
  }

  return penalties;
};

export const buildPaymentSummary = (account) => {
  const plan = buildRepaymentPlan(account);
  const entries = Array.isArray(account?.repaymentEntries)
    ? [...account.repaymentEntries].sort((a, b) => paymentTimestamp(a) - paymentTimestamp(b))
    : [];

  const totalPaidAmount = roundAmount(entries.reduce((sum, entry) => sum + Number(entry?.amount || 0), 0));

  if (!plan) {
    return {
      totalPaidAmount,
      paidInstallmentsCount: 0,
      pendingInstallmentsCount: 0,
      overdueInstallmentsCount: 0,
      overdueAmount: 0,
      daysOverdue: 0,
      oldestOverdueDate: null,
      outstandingBalance: 0,
      nextDueDate: null,
      status: totalPaidAmount > 0 ? "ACTIVE" : account?.status || "ACTIVE",
      schedule: [],
      totalRepayment: 0,
      baseTotalRepayment: 0,
      monthlyInstallment: 0,
      firstInstallment: 0,
      processingFee: 0,
      adminFee: 0,
      loanAdministrationFeeMonthly: 0,
      loanAdministrationFeeTotal: 0,
      insurance: 0,
      tax: 0,
      totalInterest: 0,
      totalPenaltyInterest: 0,
      totalInterestWithPenalty: 0,
      overduePenaltyRatePercent: Number(account?.overduePenaltyRatePercent ?? 15),
    };
  }

  let remainingPaid = totalPaidAmount;
  const now = new Date();
  let paidInstallmentsCount = 0;
  let pendingInstallmentsCount = 0;
  let overdueInstallmentsCount = 0;
  let overdueAmount = 0;
  let oldestOverdueDate = null;
  let nextDueDate = null;

  const penaltyRatePercent = Number(account?.overduePenaltyRatePercent ?? plan.overduePenaltyRatePercent ?? 15);
  const penaltyByMonth = determinePenaltyEligibility({
    schedule: plan.schedule,
    entries,
    now,
    penaltyRatePercent,
  });

  const schedule = plan.schedule.map((row) => {
    const penaltyMeta = penaltyByMonth.get(row.month) || { penaltyAmount: 0, penaltyBaseAmount: 0 };
    const penaltyAmount = roundAmount(penaltyMeta.penaltyAmount || 0);
    const due = roundAmount(Number(row.installment || 0) + penaltyAmount);
    const allocated = roundAmount(Math.min(remainingPaid, due));
    remainingPaid = roundAmount(Math.max(0, remainingPaid - allocated));
    const balanceDue = roundAmount(Math.max(0, due - allocated));

    let paymentStatus = "pending";
    if ((allocated >= due || isEffectivelyZero(balanceDue)) && due > 0) {
      paymentStatus = "paid";
      paidInstallmentsCount += 1;
    } else if (allocated > 0 && !isEffectivelyZero(balanceDue)) {
      paymentStatus = "partial";
      pendingInstallmentsCount += 1;
    } else if (row.dueDate && new Date(row.dueDate).getTime() < now.getTime()) {
      paymentStatus = "overdue";
      overdueInstallmentsCount += 1;
    } else {
      pendingInstallmentsCount += 1;
    }

    if (
      paymentStatus === "overdue" ||
      (paymentStatus === "partial" && row.dueDate && new Date(row.dueDate).getTime() < now.getTime())
    ) {
      overdueAmount = roundAmount(overdueAmount + balanceDue);
      if (!oldestOverdueDate || new Date(row.dueDate).getTime() < new Date(oldestOverdueDate).getTime()) {
        oldestOverdueDate = row.dueDate || null;
      }
    }

    if (!nextDueDate && paymentStatus !== "paid") nextDueDate = row.dueDate || null;

    return {
      ...row,
      baseInstallment: roundAmount(row.installment || 0),
      penaltyRatePercent: penaltyAmount > 0 ? penaltyRatePercent : 0,
      penaltyBaseAmount: roundAmount(penaltyMeta.penaltyBaseAmount || 0),
      penaltyAmount,
      installment: due,
      paidAmount: allocated,
      remainingAmount: isEffectivelyZero(balanceDue) ? 0 : balanceDue,
      paymentStatus,
    };
  });

  const totalPenaltyInterest = roundAmount(schedule.reduce((sum, row) => sum + Number(row.penaltyAmount || 0), 0));
  const totalRepaymentWithPenalties = roundAmount(plan.totalRepayment + totalPenaltyInterest);
  const outstandingBalance = roundAmount(Math.max(0, totalRepaymentWithPenalties - totalPaidAmount));
  let status = "ACTIVE";
  if (isEffectivelyZero(outstandingBalance)) status = "SETTLED";
  else if (overdueInstallmentsCount > 0 || overdueAmount > 0) status = "OVERDUE";

  const daysOverdue = oldestOverdueDate
    ? Math.max(0, Math.floor((now.getTime() - new Date(oldestOverdueDate).getTime()) / 86400000))
    : 0;

  return {
    ...plan,
    schedule,
    baseTotalRepayment: plan.totalRepayment,
    totalRepayment: totalRepaymentWithPenalties,
    totalPaidAmount,
    paidInstallmentsCount,
    pendingInstallmentsCount,
    overdueInstallmentsCount,
    overdueAmount,
    daysOverdue,
    oldestOverdueDate,
    outstandingBalance,
    nextDueDate,
    status,
    overduePenaltyRatePercent: penaltyRatePercent,
    totalPenaltyInterest,
    totalInterestWithPenalty: roundAmount(Number(plan.totalInterest || 0) + totalPenaltyInterest),
  };
};

export const enrichLoanAccount = (account) => {
  const obj = account?.toObject ? account.toObject() : account;
  return { ...obj, ...buildPaymentSummary(obj) };
};

export const applyPaymentSummaryToDoc = (doc) => {
  const summary = buildPaymentSummary(doc);
  doc.totalPaidAmount = summary.totalPaidAmount;
  doc.paidInstallmentsCount = summary.paidInstallmentsCount;
  doc.pendingInstallmentsCount = summary.pendingInstallmentsCount;
  doc.overdueInstallmentsCount = summary.overdueInstallmentsCount;
  doc.outstandingBalance = summary.outstandingBalance;
  doc.nextDueDate = summary.nextDueDate;
  doc.status = summary.status;
  return summary;
};

export const getNextPayableInstallment = (account) => {
  const summary = buildPaymentSummary(account);
  return summary.schedule.find((row) => row.paymentStatus !== "paid") || null;
};

export const toMoney = roundAmount;
