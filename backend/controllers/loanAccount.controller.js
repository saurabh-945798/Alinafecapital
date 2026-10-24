import mongoose from "mongoose";
import { z } from "zod";
import { LoanAccount } from "../models/LoanAccount.model.js";
import { writeAdminAudit } from "../utils/adminAudit.js";
import { normalizeMoneyForValidation, parseMoneyInput } from "../utils/numberInput.js";
import { applyPaymentSummaryToDoc, enrichLoanAccount } from "../services/loanAccountSummary.service.js";

const moneyNumberField = (schema) => z.preprocess(normalizeMoneyForValidation, schema);

const listSchema = z.object({
  status: z.string().trim().optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const paymentEntrySchema = z.object({
  paymentDate: z.string().trim().min(8),
  amount: moneyNumberField(z.coerce.number().gt(0)),
  method: z.enum(["cash", "bank_transfer", "mobile_money"]),
  reference: z.string().trim().max(120).optional().or(z.literal("")),
  note: z.string().trim().max(1000).optional().or(z.literal("")),
});

const enrichAccount = enrichLoanAccount;

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
    const oldValue = {
      totalPaidAmount: Number(doc.totalPaidAmount || 0),
      outstandingBalance: Number(doc.outstandingBalance || 0),
      status: String(doc.status || ""),
      repaymentEntriesCount: doc.repaymentEntries.length,
    };
    doc.repaymentEntries.push({
      paymentDate: new Date(parsed.data.paymentDate),
      amount: parseMoneyInput(parsed.data.amount),
      method: parsed.data.method,
      reference: String(parsed.data.reference || "").trim(),
      note: String(parsed.data.note || "").trim(),
      recordedAt: new Date(),
    });

    applyPaymentSummaryToDoc(doc);

    await doc.save();
    await writeAdminAudit(req, {
      action: "ACCOUNT_PAYMENT_ADDED",
      targetType: "LoanAccount",
      targetId: doc._id,
      oldValue,
      newValue: {
        totalPaidAmount: Number(doc.totalPaidAmount || 0),
        outstandingBalance: Number(doc.outstandingBalance || 0),
        status: String(doc.status || ""),
        repaymentEntriesCount: Array.isArray(doc.repaymentEntries) ? doc.repaymentEntries.length : 0,
      },
    });

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

    const oldEntry = {
      paymentDate: entry.paymentDate,
      amount: Number(entry.amount || 0),
      method: entry.method,
      reference: entry.reference || "",
      note: entry.note || "",
    };
    entry.paymentDate = new Date(parsed.data.paymentDate);
    entry.amount = parseMoneyInput(parsed.data.amount);
    entry.method = parsed.data.method;
    entry.reference = String(parsed.data.reference || "").trim();
    entry.note = String(parsed.data.note || "").trim();

    applyPaymentSummaryToDoc(doc);
    await doc.save();
    await writeAdminAudit(req, {
      action: "ACCOUNT_PAYMENT_UPDATED",
      targetType: "LoanAccountPayment",
      targetId: `${doc._id}:${req.params.paymentId}`,
      oldValue: oldEntry,
      newValue: {
        paymentDate: entry.paymentDate,
        amount: Number(entry.amount || 0),
        method: entry.method,
        reference: entry.reference || "",
        note: entry.note || "",
      },
    });

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

    const oldEntry = {
      paymentDate: entry.paymentDate,
      amount: Number(entry.amount || 0),
      method: entry.method,
      reference: entry.reference || "",
      note: entry.note || "",
    };
    entry.deleteOne();
    applyPaymentSummaryToDoc(doc);
    await doc.save();
    await writeAdminAudit(req, {
      action: "ACCOUNT_PAYMENT_DELETED",
      targetType: "LoanAccountPayment",
      targetId: `${doc._id}:${req.params.paymentId}`,
      oldValue: oldEntry,
      newValue: {
        deleted: true,
        totalPaidAmount: Number(doc.totalPaidAmount || 0),
        outstandingBalance: Number(doc.outstandingBalance || 0),
        status: String(doc.status || ""),
      },
    });

    return res.json({
      success: true,
      data: enrichAccount(doc),
    });
  },
};
