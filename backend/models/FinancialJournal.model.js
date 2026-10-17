import mongoose from "mongoose";

const FinancialJournalSchema = new mongoose.Schema(
  {
    journalKey: { type: String, trim: true, required: true, unique: true, index: true },
    entryType: {
      type: String,
      enum: ["LOAN_DISBURSEMENT", "REPAYMENT", "ADJUSTMENT", "REVERSAL"],
      required: true,
      index: true,
    },
    loanAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "LoanAccount", required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    sourceType: { type: String, trim: true, required: true },
    sourceId: { type: String, trim: true, required: true, index: true },
    reference: { type: String, trim: true, default: "", index: true },
    amount: { type: Number, required: true },
    currency: { type: String, trim: true, default: "MWK" },
    description: { type: String, trim: true, default: "" },
    postedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    postedByName: { type: String, trim: true, default: "" },
    postedAt: { type: Date, default: Date.now, index: true },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

FinancialJournalSchema.index({ loanAccountId: 1, postedAt: -1 });
FinancialJournalSchema.index({ entryType: 1, postedAt: -1 });

export const FinancialJournal =
  mongoose.models.FinancialJournal || mongoose.model("FinancialJournal", FinancialJournalSchema);
