import crypto from "crypto";
import fs from "fs";
import mongoose from "mongoose";
import { z } from "zod";
import { BankPayment } from "../models/BankPayment.model.js";
import { LoanAccount } from "../models/LoanAccount.model.js";
import { BANK_PAYMENT_DETAILS } from "../config/bankPayment.js";
import { normalizeEmail, normalizePhone } from "../utils/normalize.js";
import { toPersistedUploadPath } from "../utils/uploadPaths.js";
import { applyPaymentSummaryToDoc, enrichLoanAccount } from "../services/loanAccountSummary.service.js";
import { postRepaymentJournal } from "../services/financialJournal.service.js";
import { writeAdminAudit } from "../utils/adminAudit.js";
import { normalizeRole } from "../utils/rbac.js";

const submitSchema = z.object({
  loanAccountId: z.string().trim().min(1),
  amount: z.coerce.number().positive(),
  bankTransactionReference: z.string().trim().min(3).max(120),
  paymentDate: z.string().trim().min(8),
  bankUsed: z.string().trim().max(120).optional().or(z.literal("")),
  paymentReference: z.string().trim().max(80).optional().or(z.literal("")),
});

const adminDecisionSchema = z.object({
  action: z.enum(["VERIFY", "REJECT", "REQUEST_CLARIFICATION"]),
  verificationNotes: z.string().trim().max(3000).optional().or(z.literal("")),
  reason: z.string().trim().max(3000).optional().or(z.literal("")),
  confirmedInBankRecords: z.coerce.boolean().optional(),
});

const cleanReference = (value = "") => String(value || "").trim().replace(/\s+/g, " ");

const generatePaymentReference = () => {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `ALF-BNK-${date}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
};

const customerOwnsAccount = (account, user) => {
  if (!account || !user) return false;
  if (account.userId && String(account.userId) === String(user._id)) return true;
  const sameEmail = normalizeEmail(account.email) && normalizeEmail(account.email) === normalizeEmail(user.email);
  const samePhone = normalizePhone(account.phone) && normalizePhone(account.phone) === normalizePhone(user.phone);
  return Boolean(sameEmail || samePhone);
};

const toCustomerPayment = (payment) => {
  const obj = payment?.toObject ? payment.toObject() : payment;
  if (!obj) return null;
  return {
    _id: obj._id,
    paymentReference: obj.paymentReference,
    loanAccountId: obj.loanAccountId,
    amount: obj.amount,
    bankTransactionReference: obj.bankTransactionReference,
    paymentDate: obj.paymentDate,
    bankUsed: obj.bankUsed,
    status: obj.status,
    clarificationMessage: obj.clarificationMessage,
    customerResponse: obj.customerResponse,
    rejectionReason: obj.rejectionReason,
    verificationNotes: obj.status === "POSTED" ? obj.verificationNotes : "",
    submittedAt: obj.createdAt,
    verifiedAt: obj.verifiedAt,
    postedAt: obj.postedAt,
    pop: obj.pop
      ? {
          originalName: obj.pop.originalName,
          mime: obj.pop.mime,
          size: obj.pop.size,
          uploadedAt: obj.pop.uploadedAt,
          viewUrl: `/api/v1/files/payments/${obj._id}/pop`,
        }
      : null,
  };
};

const toAdminPayment = (payment) => {
  const obj = payment?.toObject ? payment.toObject() : payment;
  if (!obj) return null;
  return {
    ...obj,
    pop: obj.pop
      ? {
          originalName: obj.pop.originalName,
          mime: obj.pop.mime,
          size: obj.pop.size,
          uploadedAt: obj.pop.uploadedAt,
          viewUrl: `/api/v1/files/payments/${obj._id}/pop`,
        }
      : null,
  };
};

const safeDelete = (filePath) => {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch {
    // Keep business flow intact if cleanup fails.
  }
};

const postVerifiedPayment = async (payment, actor) => {
  const account = await LoanAccount.findById(payment.loanAccountId);
  if (!account) throw new Error("Loan account not found");

  account.repaymentEntries = Array.isArray(account.repaymentEntries) ? account.repaymentEntries : [];
  const existing = account.repaymentEntries.find(
    (entry) => String(entry.reference || "") === String(payment.paymentReference)
  );

  if (!existing) {
    const currentSummary = enrichLoanAccount(account);
    const outstanding = Number(currentSummary.outstandingBalance || 0);
    if (outstanding > 0 && Number(payment.amount) > outstanding + 0.01) {
      const error = new Error("Payment amount is greater than the current outstanding loan balance");
      error.code = "PAYMENT_EXCEEDS_OUTSTANDING";
      throw error;
    }

    account.repaymentEntries.push({
      paymentDate: payment.paymentDate || new Date(),
      amount: Number(payment.amount),
      method: "bank_transfer",
      reference: payment.paymentReference,
      note: `Verified bank payment. Bank transaction reference: ${payment.bankTransactionReference}`,
      recordedAt: new Date(),
    });
    applyPaymentSummaryToDoc(account);
    await account.save();
  }

  await postRepaymentJournal({
    loanAccount: account,
    userId: payment.userId,
    sourceType: "BANK_PAYMENT",
    sourceId: payment._id,
    reference: payment.paymentReference,
    amount: payment.amount,
    actor,
    metadata: {
      bankTransactionReference: payment.bankTransactionReference,
      bankUsed: payment.bankUsed || "",
    },
  });

  payment.status = "POSTED";
  payment.postedAt = payment.postedAt || new Date();
  payment.history.push({
    action: "PAYMENT_POSTED",
    actorUserId: actor?._id || null,
    actorName: actor?.fullName || actor?.email || "Finance",
    actorRole: normalizeRole(actor?.role || "PAYMENT_VERIFIER"),
    note: "Verified bank payment posted to the loan account.",
  });
  await payment.save();

  return { payment, account: enrichLoanAccount(account) };
};

export const bankPaymentController = {
  details: async (req, res) => {
    return res.json({ success: true, data: { ...BANK_PAYMENT_DETAILS, paymentReference: generatePaymentReference() } });
  },

  listMine: async (req, res) => {
    const items = await BankPayment.find({ userId: req.user._id }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: { items: items.map(toCustomerPayment) } });
  },

  submit: async (req, res) => {
    const parsed = submitSchema.safeParse(req.body || {});
    if (!parsed.success) {
      safeDelete(req.file?.path);
      return res.status(400).json({ success: false, message: "Please complete all bank payment details", details: parsed.error.issues });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Proof of Payment (POP) is required", code: "POP_REQUIRED" });
    }
    if (!mongoose.Types.ObjectId.isValid(parsed.data.loanAccountId)) {
      safeDelete(req.file.path);
      return res.status(400).json({ success: false, message: "Invalid loan account" });
    }
    const account = await LoanAccount.findById(parsed.data.loanAccountId);
    if (!account || !customerOwnsAccount(account, req.user)) {
      safeDelete(req.file.path);
      return res.status(404).json({ success: false, message: "Loan account not found" });
    }

    const amount = Number(parsed.data.amount);
    const summary = enrichLoanAccount(account);
    if (Number(summary.outstandingBalance || 0) > 0 && amount > Number(summary.outstandingBalance) + 0.01) {
      safeDelete(req.file.path);
      return res.status(400).json({ success: false, message: "Payment amount cannot exceed the outstanding loan balance" });
    }

    const bankTransactionReference = cleanReference(parsed.data.bankTransactionReference);
    const duplicate = await BankPayment.findOne({
      loanAccountId: account._id,
      bankTransactionReference: { $regex: `^${bankTransactionReference.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
      amount,
      status: { $ne: "REJECTED" },
    }).lean();
    if (duplicate) {
      safeDelete(req.file.path);
      return res.status(409).json({
        success: false,
        message: "This bank payment appears to have already been submitted.",
        code: "DUPLICATE_BANK_PAYMENT",
        data: { paymentReference: duplicate.paymentReference, status: duplicate.status },
      });
    }

    const requestedPaymentReference = String(parsed.data.paymentReference || "").trim().toUpperCase();
    let paymentReference = /^ALF-BNK-[A-Z0-9-]{8,60}$/.test(requestedPaymentReference)
      ? requestedPaymentReference
      : generatePaymentReference();
    if (await BankPayment.exists({ paymentReference })) paymentReference = generatePaymentReference();

    const payment = await BankPayment.create({
      paymentReference,
      loanAccountId: account._id,
      userId: req.user._id,
      amount,
      bankTransactionReference,
      paymentDate: new Date(parsed.data.paymentDate),
      bankUsed: parsed.data.bankUsed || "",
      pop: {
        originalName: req.file.originalname,
        filePath: toPersistedUploadPath(req.file.path, "bank-payment-pop"),
        mime: req.file.mimetype,
        size: Number(req.file.size || 0),
        uploadedAt: new Date(),
      },
      status: "PENDING_VERIFICATION",
      history: [
        {
          action: "PAYMENT_SUBMITTED",
          actorUserId: req.user._id,
          actorName: req.user.fullName || req.user.email || "Customer",
          actorRole: "user",
          note: "Bank payment and Proof of Payment submitted for verification.",
        },
      ],
    });

    return res.status(201).json({
      success: true,
      message: "Payment submitted successfully. Your Proof of Payment has been received and is awaiting verification.",
      data: toCustomerPayment(payment),
    });
  },

  respondToClarification: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      safeDelete(req.file?.path);
      return res.status(400).json({ success: false, message: "Invalid payment id" });
    }
    const payment = await BankPayment.findOne({ _id: req.params.id, userId: req.user._id });
    if (!payment) {
      safeDelete(req.file?.path);
      return res.status(404).json({ success: false, message: "Payment not found" });
    }
    if (!["REQUIRES_CLARIFICATION", "REJECTED"].includes(payment.status)) {
      safeDelete(req.file?.path);
      return res.status(409).json({ success: false, message: "This payment is not awaiting customer clarification" });
    }
    const response = String(req.body?.response || "").trim();
    if (!response && !req.file) {
      return res.status(400).json({ success: false, message: "Enter a response or upload a replacement POP" });
    }

    if (req.file) {
      const previous = payment.pop?.filePath || "";
      payment.pop = {
        originalName: req.file.originalname,
        filePath: toPersistedUploadPath(req.file.path, "bank-payment-pop-replacement"),
        mime: req.file.mimetype,
        size: Number(req.file.size || 0),
        uploadedAt: new Date(),
      };
      if (previous && previous !== payment.pop.filePath) safeDelete(previous);
    }
    payment.customerResponse = response;
    payment.status = "PENDING_VERIFICATION";
    payment.rejectionReason = "";
    payment.history.push({
      action: req.file ? "POP_REPLACED_AND_RESPONSE_SUBMITTED" : "CUSTOMER_CLARIFICATION_SUBMITTED",
      actorUserId: req.user._id,
      actorName: req.user.fullName || req.user.email || "Customer",
      actorRole: "user",
      note: response || "Replacement Proof of Payment uploaded.",
    });
    await payment.save();
    return res.json({ success: true, message: "Your response has been sent for verification.", data: toCustomerPayment(payment) });
  },

  adminList: async (req, res) => {
    const status = String(req.query.status || "ALL").trim().toUpperCase();
    const filter = status && status !== "ALL" ? { status } : {};
    const items = await BankPayment.find(filter)
      .populate("loanAccountId", "accountNumber customerName approvedAmount disbursedAmount outstandingBalance nextDueDate status email phone")
      .populate("userId", "fullName email phone")
      .sort({ createdAt: -1 })
      .limit(300)
      .lean();
    return res.json({ success: true, data: { items: items.map(toAdminPayment) } });
  },

  adminGet: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid payment id" });
    }
    const item = await BankPayment.findById(req.params.id)
      .populate("loanAccountId", "accountNumber customerName approvedAmount disbursedAmount outstandingBalance nextDueDate overdueInstallmentsCount status totalPaidAmount email phone")
      .populate("userId", "fullName email phone")
      .lean();
    if (!item) return res.status(404).json({ success: false, message: "Payment not found" });
    return res.json({ success: true, data: toAdminPayment(item) });
  },

  adminDecision: async (req, res) => {
    const parsed = adminDecisionSchema.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ success: false, message: "Validation failed", details: parsed.error.issues });
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ success: false, message: "Invalid payment id" });
    const payment = await BankPayment.findById(req.params.id);
    if (!payment) return res.status(404).json({ success: false, message: "Payment not found" });
    if (payment.status === "POSTED") {
      return res.json({ success: true, message: "Payment is already posted", data: toAdminPayment(payment) });
    }

    const action = parsed.data.action;
    const actorName = req.user?.fullName || req.user?.email || "Finance";
    if (action === "REQUEST_CLARIFICATION") {
      const reason = String(parsed.data.reason || "").trim();
      if (reason.length < 3) return res.status(400).json({ success: false, message: "Enter the clarification required from the customer" });
      payment.status = "REQUIRES_CLARIFICATION";
      payment.clarificationMessage = reason;
      payment.history.push({ action: "CLARIFICATION_REQUESTED", actorUserId: req.user?._id || null, actorName, actorRole: normalizeRole(req.user?.role), note: reason });
      await payment.save();
      await writeAdminAudit(req, { action: "BANK_PAYMENT_CLARIFICATION_REQUESTED", targetType: "BankPayment", targetId: payment._id, newValue: { status: payment.status, reason } });
      return res.json({ success: true, data: toAdminPayment(payment) });
    }

    if (action === "REJECT") {
      const reason = String(parsed.data.reason || "").trim();
      if (reason.length < 3) return res.status(400).json({ success: false, message: "A rejection reason is required" });
      payment.status = "REJECTED";
      payment.rejectionReason = reason;
      payment.rejectedBy = req.user?._id || null;
      payment.rejectedAt = new Date();
      payment.history.push({ action: "PAYMENT_REJECTED", actorUserId: req.user?._id || null, actorName, actorRole: normalizeRole(req.user?.role), note: reason });
      await payment.save();
      await writeAdminAudit(req, { action: "BANK_PAYMENT_REJECTED", targetType: "BankPayment", targetId: payment._id, newValue: { status: payment.status, reason } });
      return res.json({ success: true, data: toAdminPayment(payment) });
    }

    if (!parsed.data.confirmedInBankRecords) {
      return res.status(400).json({ success: false, message: "Confirm that the payment has been identified in the bank/reconciliation records before verification" });
    }
    const notes = String(parsed.data.verificationNotes || "").trim();
    if (notes.length < 3) return res.status(400).json({ success: false, message: "Verification notes are required" });

    const duplicate = await BankPayment.findOne({
      _id: { $ne: payment._id },
      loanAccountId: payment.loanAccountId,
      bankTransactionReference: payment.bankTransactionReference,
      amount: payment.amount,
      status: { $in: ["VERIFIED", "POSTED"] },
    }).lean();
    if (duplicate) {
      return res.status(409).json({ success: false, message: "A verified payment with the same bank reference, loan and amount already exists", code: "DUPLICATE_BANK_PAYMENT" });
    }

    payment.status = "VERIFIED";
    payment.verificationNotes = notes;
    payment.verifiedBy = req.user?._id || null;
    payment.verifiedByName = actorName;
    payment.verifiedAt = new Date();
    payment.history.push({ action: "PAYMENT_VERIFIED", actorUserId: req.user?._id || null, actorName, actorRole: normalizeRole(req.user?.role), note: notes });
    await payment.save();

    try {
      const result = await postVerifiedPayment(payment, req.user);
      await writeAdminAudit(req, {
        action: "BANK_PAYMENT_VERIFIED_AND_POSTED",
        targetType: "BankPayment",
        targetId: payment._id,
        newValue: { status: "POSTED", amount: payment.amount, paymentReference: payment.paymentReference, loanAccountId: payment.loanAccountId },
      });
      return res.json({ success: true, data: { payment: toAdminPayment(result.payment), loanAccount: result.account } });
    } catch (error) {
      return res.status(409).json({ success: false, message: error.message || "Payment was verified but could not be posted. Retry after resolving the account issue.", code: error.code || "POSTING_FAILED", data: toAdminPayment(payment) });
    }
  },
};
