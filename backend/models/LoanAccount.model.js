import mongoose from "mongoose";

const RepaymentEntrySchema = new mongoose.Schema(
  {
    paymentDate: { type: Date, required: true },
    amount: { type: Number, required: true, min: 0 },
    method: {
      type: String,
      enum: ["cash", "bank_transfer", "mobile_money"],
      default: "cash",
    },
    reference: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    recordedAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const LoanAccountSchema = new mongoose.Schema(
  {
    accountNumber: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      index: true,
    },
    inquiryId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoanInquiry",
      required: true,
      unique: true,
      index: true,
    },
    applicationCode: { type: String, trim: true, default: "" },
    customerName: { type: String, required: true, trim: true },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    loanProductSlug: { type: String, trim: true, default: "" },
    loanProductName: { type: String, trim: true, default: "" },
    approvedAmount: { type: Number, min: 0, default: 0 },
    disbursedAmount: { type: Number, min: 0, default: 0 },
    tenureMonths: { type: Number, min: 1, default: 1 },
    monthlyRate: { type: Number, min: 0, default: 0 },
    processingFeeRate: { type: Number, min: 0, default: 0.025 },
    adminFeeRate: { type: Number, min: 0, default: 0.025 },
    verifiedBy: { type: String, trim: true, default: "" },
    approvedBy: { type: String, trim: true, default: "" },
    disbursedBy: { type: String, trim: true, default: "" },
    disbursementMethod: { type: String, trim: true, default: "" },
    disbursementBankName: { type: String, trim: true, default: "" },
    disbursementAccountName: { type: String, trim: true, default: "" },
    disbursementAccountNumber: { type: String, trim: true, default: "" },
    disbursementMobileProvider: { type: String, trim: true, default: "" },
    disbursementMobileNumber: { type: String, trim: true, default: "" },
    transactionReference: { type: String, trim: true, default: "" },
    disbursementNote: { type: String, trim: true, default: "" },
    approvedAt: { type: Date, default: null },
    disbursedAt: { type: Date, default: null },
    nextDueDate: { type: Date, default: null },
    totalPaidAmount: { type: Number, min: 0, default: 0 },
    paidInstallmentsCount: { type: Number, min: 0, default: 0 },
    pendingInstallmentsCount: { type: Number, min: 0, default: 0 },
    overdueInstallmentsCount: { type: Number, min: 0, default: 0 },
    outstandingBalance: { type: Number, min: 0, default: 0 },
    repaymentEntries: { type: [RepaymentEntrySchema], default: [] },
    status: {
      type: String,
      enum: ["ACTIVE", "OVERDUE", "CLOSED", "SETTLED"],
      default: "ACTIVE",
      index: true,
    },
  },
  { timestamps: true }
);

LoanAccountSchema.index({ createdAt: -1 });
LoanAccountSchema.index({ status: 1, createdAt: -1 });

export const LoanAccount =
  mongoose.models.LoanAccount || mongoose.model("LoanAccount", LoanAccountSchema);
