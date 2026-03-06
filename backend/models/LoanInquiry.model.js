import mongoose from "mongoose";

const LoanInquirySchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    loanProductSlug: { type: String, required: true, trim: true },
    monthlyIncome: { type: Number, min: 0 },
    requestedAmount: { type: Number, min: 0 },
    preferredTenureMonths: { type: Number, min: 1 },
    notes: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["NEW", "CONTACTED", "QUALIFIED", "CLOSED"],
      default: "NEW",
      index: true,
    },
    adminNote: { type: String, trim: true, default: "" },
    contactedAt: { type: Date, default: null },
    source: { type: String, trim: true, default: "website" },
  },
  { timestamps: true }
);

LoanInquirySchema.index({ createdAt: -1 });

export const LoanInquiry =
  mongoose.models.LoanInquiry || mongoose.model("LoanInquiry", LoanInquirySchema);

