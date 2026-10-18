import mongoose from "mongoose";

const HistorySchema = new mongoose.Schema(
  {
    action: { type: String, trim: true, required: true },
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    actorName: { type: String, trim: true, default: "" },
    actorRole: { type: String, trim: true, default: "" },
    note: { type: String, trim: true, default: "" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const PopSchema = new mongoose.Schema(
  {
    originalName: { type: String, trim: true, required: true },
    filePath: { type: String, trim: true, required: true },
    mime: { type: String, trim: true, required: true },
    size: { type: Number, min: 0, default: 0 },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const BankPaymentSchema = new mongoose.Schema(
  {
    paymentReference: { type: String, trim: true, required: true, unique: true, index: true },
    loanAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "LoanAccount", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 0.01 },
    bankTransactionReference: { type: String, trim: true, required: true, index: true },
    paymentDate: { type: Date, required: true },
    bankUsed: { type: String, trim: true, default: "" },
    pop: { type: PopSchema, required: true },
    status: {
      type: String,
      enum: ["PENDING_VERIFICATION", "REQUIRES_CLARIFICATION", "VERIFIED", "REJECTED", "POSTED"],
      default: "PENDING_VERIFICATION",
      index: true,
    },
    clarificationMessage: { type: String, trim: true, default: "" },
    customerResponse: { type: String, trim: true, default: "" },
    verificationNotes: { type: String, trim: true, default: "" },
    rejectionReason: { type: String, trim: true, default: "" },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    verifiedByName: { type: String, trim: true, default: "" },
    verifiedAt: { type: Date, default: null },
    rejectedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    rejectedAt: { type: Date, default: null },
    postedAt: { type: Date, default: null },
    history: { type: [HistorySchema], default: [] },
  },
  { timestamps: true }
);

BankPaymentSchema.index({ loanAccountId: 1, createdAt: -1 });
BankPaymentSchema.index({ userId: 1, createdAt: -1 });
BankPaymentSchema.index({ status: 1, createdAt: -1 });
BankPaymentSchema.index({ loanAccountId: 1, bankTransactionReference: 1, amount: 1 });

export const BankPayment =
  mongoose.models.BankPayment || mongoose.model("BankPayment", BankPaymentSchema);
