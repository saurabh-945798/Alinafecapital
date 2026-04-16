import mongoose from "mongoose";
import { z } from "zod";
import { LoanAccount } from "../models/LoanAccount.model.js";

const listSchema = z.object({
  status: z.string().trim().optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const paymentEntrySchema = z.object({
  paymentDate: z.string().trim().min(8),
  amount: z.coerce.number().gt(0),
  method: z.enum(["cash", "bank_transfer", "mobile_money"]),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

const roundAmount = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.round(amount * 1000) / 1000 : 0;
};

const isEffectivelyZero = (value) => Math.abs(Number(value || 0)) <= 0.0005;

const calculateReducingInstallment = (principal, monthlyRate, months) => {
  if (principal <= 0 || monthlyRate <= 0 || months <= 0) return 0;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
};

const addMonths = (value, monthsToAdd) => {
  const date = new Date(value || new Date());
  if (Number.isNaN(date.getTime())) return null;
  date.setMonth(date.getMonth() + monthsToAdd);
  return date;
};

const buildRepaymentPlan = (account) => {
  const principal = Number(account?.disbursedAmount || 0);
  const months = Number(account?.tenureMonths || 0);
  const monthlyRate = Number(account?.monthlyRate || 0);
  if (principal <= 0 || months <= 0) return null;

  const installment = calculateReducingInstallment(principal, monthlyRate, months);
  const processingFee = roundAmount(principal * Number(account?.processingFeeRate || 0));
  const adminFee = roundAmount(principal * Number(account?.adminFeeRate || 0));
  const startDate =
    account?.disbursedAt || account?.approvedAt || account?.createdAt || new Date();

  let balance = roundAmount(principal);
  const schedule = [];

  for (let month = 1; month <= months; month += 1) {
    const openingBalance = balance;
    const interest = roundAmount(openingBalance * monthlyRate);
    const principalPaid = roundAmount(Math.max(0, installment - interest));
    balance = roundAmount(Math.max(0, openingBalance - principalPaid));
    const fees = month === 1 ? roundAmount(processingFee + adminFee) : 0;

    schedule.push({
      month,
      dueDate: addMonths(startDate, month),
      installment: roundAmount(installment + fees),
      openingBalance: roundAmount(openingBalance),
      principalPaid: roundAmount(principalPaid),
      interest: roundAmount(interest),
      fees,
      closingBalance: roundAmount(balance),
    });
  }

  const totalInterest = roundAmount(schedule.reduce((sum, row) => sum + row.interest, 0));
  const totalRepayment = roundAmount(principal + totalInterest + processingFee + adminFee);

  return {
    schedule,
    totalRepayment,
    monthlyInstallment: roundAmount(installment),
    firstInstallment: roundAmount(schedule[0]?.installment || installment),
    processingFee,
    adminFee,
    totalInterest,
  };
};

const buildPaymentSummary = (account) => {
  const plan = buildRepaymentPlan(account);
  const entries = Array.isArray(account?.repaymentEntries)
    ? [...account.repaymentEntries].sort(
        (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
      )
    : [];

  const totalPaidAmount = roundAmount(entries.reduce(
    (sum, entry) => sum + Number(entry?.amount || 0),
    0
  ));

  if (!plan) {
    return {
      totalPaidAmount,
      paidInstallmentsCount: 0,
      pendingInstallmentsCount: 0,
      overdueInstallmentsCount: 0,
      outstandingBalance: 0,
      nextDueDate: null,
      status: totalPaidAmount > 0 ? "ACTIVE" : account?.status || "ACTIVE",
      schedule: [],
      totalRepayment: 0,
      monthlyInstallment: 0,
      firstInstallment: 0,
      processingFee: 0,
      adminFee: 0,
      totalInterest: 0,
    };
  }

  let remainingPaid = totalPaidAmount;
  const now = new Date();
  let paidInstallmentsCount = 0;
  let pendingInstallmentsCount = 0;
  let overdueInstallmentsCount = 0;
  let nextDueDate = null;

  const schedule = plan.schedule.map((row) => {
    const due = roundAmount(row.installment || 0);
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

    if (!nextDueDate && paymentStatus !== "paid") {
      nextDueDate = row.dueDate || null;
    }

    return {
      ...row,
      paidAmount: allocated,
      remainingAmount: isEffectivelyZero(balanceDue) ? 0 : balanceDue,
      paymentStatus,
    };
  });

  const outstandingBalance = roundAmount(Math.max(0, plan.totalRepayment - totalPaidAmount));
  let status = "ACTIVE";
  if (isEffectivelyZero(outstandingBalance)) {
    status = "SETTLED";
  } else if (overdueInstallmentsCount > 0) {
    status = "OVERDUE";
  }

  return {
    ...plan,
    schedule,
    totalPaidAmount,
    paidInstallmentsCount,
    pendingInstallmentsCount,
    overdueInstallmentsCount,
    outstandingBalance,
    nextDueDate,
    status,
  };
};

const enrichAccount = (account) => {
  const obj = account?.toObject ? account.toObject() : account;
  const summary = buildPaymentSummary(obj);
  return {
    ...obj,
    ...summary,
  };
};

const applyPaymentSummaryToDoc = (doc) => {
  const summary = buildPaymentSummary(doc);
  doc.totalPaidAmount = summary.totalPaidAmount;
  doc.paidInstallmentsCount = summary.paidInstallmentsCount;
  doc.pendingInstallmentsCount = summary.pendingInstallmentsCount;
  doc.overdueInstallmentsCount = summary.overdueInstallmentsCount;
  doc.outstandingBalance = summary.outstandingBalance;
  doc.nextDueDate = summary.nextDueDate;
  doc.status = summary.status;
};

export const loanAccountController = {
  adminList: async (req, res) => {
    const parsed = listSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
      });
    }

    const { status, q, page, limit } = parsed.data;
    const filter = {};

    if (status && status !== "ALL") {
      filter.status = String(status).toUpperCase();
    }

    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { customerName: { $regex: safe, $options: "i" } },
        { phone: { $regex: safe, $options: "i" } },
        { email: { $regex: safe, $options: "i" } },
        { accountNumber: { $regex: safe, $options: "i" } },
        { applicationCode: { $regex: safe, $options: "i" } },
        { loanProductName: { $regex: safe, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      LoanAccount.countDocuments(filter),
      LoanAccount.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    return res.json({
      success: true,
      data: {
        items: items.map(enrichAccount),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  },

  adminGetById: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account id",
        code: "VALIDATION_ERROR",
      });
    }

    const doc = await LoanAccount.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Loan account not found",
        code: "NOT_FOUND",
      });
    }

    return res.json({
      success: true,
      data: enrichAccount(doc),
    });
  },

  adminAddPayment: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account id",
        code: "VALIDATION_ERROR",
      });
    }

    const parsed = paymentEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.issues,
      });
    }

    const doc = await LoanAccount.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Loan account not found",
        code: "NOT_FOUND",
      });
    }

    doc.repaymentEntries = Array.isArray(doc.repaymentEntries) ? doc.repaymentEntries : [];
    doc.repaymentEntries.push({
      paymentDate: new Date(parsed.data.paymentDate),
      amount: Number(parsed.data.amount),
      method: parsed.data.method,
      reference: String(parsed.data.reference || "").trim(),
      note: String(parsed.data.note || "").trim(),
      recordedAt: new Date(),
    });

    applyPaymentSummaryToDoc(doc);

    await doc.save();

    return res.json({
      success: true,
      data: enrichAccount(doc),
    });
  },

  adminUpdatePayment: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account id",
        code: "VALIDATION_ERROR",
      });
    }

    const parsed = paymentEntrySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.issues,
      });
    }

    const doc = await LoanAccount.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Loan account not found",
        code: "NOT_FOUND",
      });
    }

    const entry = doc.repaymentEntries?.id(req.params.paymentId);
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Payment entry not found",
        code: "NOT_FOUND",
      });
    }

    entry.paymentDate = new Date(parsed.data.paymentDate);
    entry.amount = Number(parsed.data.amount);
    entry.method = parsed.data.method;
    entry.reference = String(parsed.data.reference || "").trim();
    entry.note = String(parsed.data.note || "").trim();

    applyPaymentSummaryToDoc(doc);
    await doc.save();

    return res.json({
      success: true,
      data: enrichAccount(doc),
    });
  },

  adminDeletePayment: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account id",
        code: "VALIDATION_ERROR",
      });
    }

    const doc = await LoanAccount.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Loan account not found",
        code: "NOT_FOUND",
      });
    }

    const entry = doc.repaymentEntries?.id(req.params.paymentId);
    if (!entry) {
      return res.status(404).json({
        success: false,
        message: "Payment entry not found",
        code: "NOT_FOUND",
      });
    }

    entry.deleteOne();
    applyPaymentSummaryToDoc(doc);
    await doc.save();

    return res.json({
      success: true,
      data: enrichAccount(doc),
    });
  },
};
