import test from "node:test";
import assert from "node:assert/strict";
import { emiCalculatorService } from "../services/emiCalculator.service.js";
import { buildPaymentSummary, buildRepaymentPlan } from "../services/loanAccountSummary.service.js";
import { buildGatewayStorageSnapshot, findProhibitedCardData } from "../utils/paymentSecurity.js";

const reducingProduct = {
  minAmount: 100000,
  maxAmount: 5000000,
  minTenureMonths: 3,
  maxTenureMonths: 24,
  interestType: "reducing",
  interestRateMonthly: 5,
  processingFeeType: "percent",
  processingFeeValue: 2.5,
  adminFeeType: "percent",
  adminFeeValue: 2.5,
  overduePenaltyRatePercent: 15,
  loanAdministrationFeeMonthly: 0,
  insuranceType: "percent",
  insuranceValue: 1,
  taxRatePercent: 16.5,
};

const accountFromProduct = (product, overrides = {}) => ({
  disbursedAmount: 1000000,
  tenureMonths: 12,
  disbursedAt: new Date("2026-01-01T00:00:00Z"),
  interestType: product.interestType,
  interestRateMonthly: product.interestRateMonthly,
  processingFeeType: product.processingFeeType,
  processingFeeValue: product.processingFeeValue,
  adminFeeType: product.adminFeeType,
  adminFeeValue: product.adminFeeValue,
  overduePenaltyRatePercent: product.overduePenaltyRatePercent,
  loanAdministrationFeeMonthly: 0,
  insuranceType: product.insuranceType,
  insuranceValue: product.insuranceValue,
  taxRatePercent: product.taxRatePercent,
  repaymentEntries: [],
  ...overrides,
});

test("reducing-balance account schedule reconciles to product calculator with one-time fees", () => {
  const amount = 1000000;
  const tenureMonths = 12;
  const quote = emiCalculatorService.calculate({ product: reducingProduct, amount, tenureMonths });
  const plan = buildRepaymentPlan(accountFromProduct(reducingProduct));

  assert.ok(plan);
  assert.equal(plan.schedule.length, tenureMonths);
  assert.ok(Math.abs(plan.totalRepayment - quote.totalPayable) <= 0.1, `${plan.totalRepayment} vs ${quote.totalPayable}`);
  assert.ok(Math.abs(plan.totalInterest - quote.totalInterest) <= 0.1);
  assert.equal(plan.processingFee, quote.processingFee);
  assert.equal(plan.adminFee, quote.adminFee);
  assert.equal(plan.insurance, quote.insurance);
  assert.equal(plan.tax, quote.tax);
  assert.equal(plan.loanAdministrationFeeMonthly, 0);
  assert.equal(plan.loanAdministrationFeeTotal, 0);
  assert.equal(plan.schedule[0].adminFee, quote.adminFee);
  assert.equal(plan.schedule[1].adminFee, 0);
  assert.equal(plan.schedule.at(-1).closingBalance, 0);
});

test("flat-interest account schedule reconciles to product calculator", () => {
  const product = {
    ...reducingProduct,
    interestType: "flat",
    interestRateMonthly: 3,
    processingFeeType: "percent",
    processingFeeValue: 2.5,
    adminFeeType: "percent",
    adminFeeValue: 2.5,
    insuranceType: "flat",
    insuranceValue: 10000,
  };
  const amount = 600000;
  const tenureMonths = 6;
  const quote = emiCalculatorService.calculate({ product, amount, tenureMonths });
  const plan = buildRepaymentPlan(accountFromProduct(product, { disbursedAmount: amount, tenureMonths }));

  assert.ok(Math.abs(plan.totalRepayment - quote.totalPayable) <= 0.1);
  assert.ok(Math.abs(plan.totalInterest - quote.totalInterest) <= 0.1);
  assert.equal(plan.adminFee, amount * 0.025);
  assert.equal(plan.schedule.at(-1).closingBalance, 0);
});

test("zero-interest reducing product amortizes principal instead of producing a zero installment", () => {
  const product = {
    ...reducingProduct,
    interestRateMonthly: 0,
    processingFeeValue: 0,
    adminFeeValue: 0,
    insuranceValue: 0,
    taxRatePercent: 0,
  };
  const plan = buildRepaymentPlan(accountFromProduct(product, { disbursedAmount: 120000, tenureMonths: 12 }));
  assert.equal(plan.schedule.length, 12);
  assert.equal(plan.totalInterest, 0);
  assert.equal(plan.totalRepayment, 120000);
  assert.equal(plan.schedule.at(-1).closingBalance, 0);
});

test("15 percent overdue penalty is added once to a missed installment and outstanding balance", () => {
  const product = {
    ...reducingProduct,
    interestRateMonthly: 0,
    processingFeeValue: 0,
    adminFeeValue: 0,
    insuranceValue: 0,
    taxRatePercent: 0,
  };
  const account = accountFromProduct(product, {
    disbursedAmount: 120000,
    tenureMonths: 3,
    disbursedAt: new Date("2025-01-01T00:00:00Z"),
  });
  const summary = buildPaymentSummary(account);
  const first = summary.schedule[0];
  assert.equal(first.baseInstallment, 40000);
  assert.equal(first.penaltyAmount, 6000);
  assert.equal(first.installment, 46000);
  assert.ok(summary.totalPenaltyInterest >= 6000);
  assert.equal(summary.totalInterestWithPenalty, summary.totalPenaltyInterest);
  assert.ok(summary.outstandingBalance > 120000);
});

test("installment cleared by its due date does not attract an overdue penalty", () => {
  const product = {
    ...reducingProduct,
    interestRateMonthly: 0,
    processingFeeValue: 0,
    adminFeeValue: 0,
    insuranceValue: 0,
    taxRatePercent: 0,
  };
  const account = accountFromProduct(product, {
    disbursedAmount: 120000,
    tenureMonths: 3,
    disbursedAt: new Date("2025-01-01T00:00:00Z"),
    repaymentEntries: [{ paymentDate: new Date("2025-01-20T00:00:00Z"), amount: 40000 }],
  });
  const summary = buildPaymentSummary(account);
  assert.equal(summary.schedule[0].penaltyAmount, 0);
  assert.equal(summary.schedule[0].paymentStatus, "paid");
});

test("payment allocation never reports a negative outstanding balance and settles exactly", () => {
  const account = accountFromProduct(reducingProduct, { disbursedAt: new Date() });
  const plan = buildRepaymentPlan(account);
  const summary = buildPaymentSummary({
    ...account,
    repaymentEntries: [{ paymentDate: new Date(), amount: plan.totalRepayment }],
  });
  assert.equal(summary.outstandingBalance, 0);
  assert.equal(summary.status, "SETTLED");
  assert.equal(summary.paidInstallmentsCount, account.tenureMonths);
});

test("payment security rejects PAN/CVV material and persists only safe gateway fields", () => {
  const findings = findProhibitedCardData({ cardNumber: "4111111111111111", cvv: "123", amount: 1000 });
  assert.ok(findings.some((entry) => entry.includes("cardNumber")));
  assert.ok(findings.some((entry) => entry.includes("cvv")));

  const snapshot = buildGatewayStorageSnapshot({
    result: "SUCCESS",
    sourceOfFunds: { provided: { card: { number: "4111111111111111", securityCode: "123" } } },
    order: { id: "ORDER-1", amount: 1000, currency: "MWK", status: "PAID" },
    transaction: [{ id: "TX-1", response: { gatewayCode: "APPROVED" } }],
  });
  const serialized = JSON.stringify(snapshot);
  assert.equal(serialized.includes("4111111111111111"), false);
  assert.equal(serialized.includes('"123"'), false);
  assert.equal(snapshot.order.status, "PAID");
});
