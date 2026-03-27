import mongoose from "mongoose";

const InquiryDocumentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "national_id",
        "bank_statement_3_months",
        "payslip_or_business_proof",
        "address_proof",
      ],
      required: true,
    },
    fileUrl: { type: String, required: true },
    filePath: { type: String, required: true },
    mime: { type: String, required: true },
    uploadedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const InquiryActionSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true },
    title: { type: String, required: true, trim: true },
    note: { type: String, trim: true, default: "" },
    status: { type: String, trim: true, default: "" },
    actor: { type: String, trim: true, default: "System" },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const LoanInquirySchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    address: { type: String, required: true, trim: true },
    addressLine1: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    district: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: "Malawi" },
    employmentType: { type: String, trim: true, default: "" },
    governmentId: { type: String, trim: true, default: "" },
    monthlyIncome: { type: Number, min: 0 },
    bankName: { type: String, trim: true, default: "" },
    accountNumber: { type: String, trim: true, default: "" },
    branchCode: { type: String, trim: true, default: "" },
    reference1Name: { type: String, trim: true, default: "" },
    reference1Phone: { type: String, trim: true, default: "" },
    reference2Name: { type: String, trim: true, default: "" },
    reference2Phone: { type: String, trim: true, default: "" },
    avatarUrl: { type: String, trim: true, default: "" },
    avatarPath: { type: String, trim: true, default: "" },
    documents: { type: [InquiryDocumentSchema], default: [] },
    profileCompletion: { type: Number, default: 0, min: 0, max: 100 },
    kycStatus: {
      type: String,
      enum: ["not_started", "pending", "verified", "rejected"],
      default: "not_started",
      index: true,
    },
    kycRemarks: { type: String, trim: true, default: "" },
    submittedAt: { type: Date, default: null },
    verifiedAt: { type: Date, default: null },
    rejectedAt: { type: Date, default: null },
    publicAccessToken: { type: String, required: true, unique: true, index: true },
    loanProductSlug: { type: String, required: true, trim: true },
    loanProductName: { type: String, required: true, trim: true },
    requestedAmount: { type: Number, min: 0 },
    preferredTenureMonths: { type: Number, min: 1 },
    notes: { type: String, trim: true, default: "" },
    status: {
      type: String,
      enum: ["NEW", "CONTACTED", "KYC_SENT", "KYC_REJECTED", "APPROVED", "CLOSED", "QUALIFIED"],
      default: "NEW",
      index: true,
    },
    adminNote: { type: String, trim: true, default: "" },
    closeReason: { type: String, trim: true, default: "" },
    contactedAt: { type: Date, default: null },
    kycSentAt: { type: Date, default: null },
    approvedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    actionHistory: { type: [InquiryActionSchema], default: [] },
    source: { type: String, trim: true, default: "website" },
  },
  { timestamps: true }
);

LoanInquirySchema.index({ createdAt: -1 });
LoanInquirySchema.index({ status: 1, createdAt: -1 });
LoanInquirySchema.index({ status: 1, updatedAt: -1 });

export const LoanInquiry =
  mongoose.models.LoanInquiry || mongoose.model("LoanInquiry", LoanInquirySchema);
