import mongoose from "mongoose";

const DocumentSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "national_id",
        "bank_statement_3_months",
        "security_offer",
        "guarantor_national_id",
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

const UserProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
      index: true,
    },
    fullName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phone: { type: String, trim: true },
    addressLine1: { type: String, trim: true },
    city: { type: String, trim: true },
    district: { type: String, trim: true },
    country: { type: String, trim: true, default: "Malawi" },
    employmentType: { type: String, trim: true },
    businessName: { type: String, trim: true, default: "" },
    employerNameOrBusinessAddress: { type: String, trim: true, default: "" },
    businessActivityNature: { type: String, trim: true, default: "" },
    jobTitle: { type: String, trim: true, default: "" },
    employmentNumber: { type: String, trim: true, default: "" },
    employmentStatus: { type: String, trim: true, default: "" },
    contractDurationYears: { type: Number, min: 0, default: null },
    contractDurationMonths: { type: Number, min: 0, default: null },
    durationWorkedYears: { type: Number, min: 0, default: null },
    durationWorkedMonths: { type: Number, min: 0, default: null },
    hrContactPhone: { type: String, trim: true, default: "" },
    governmentId: { type: String, trim: true, default: "" },
    salaryDate: { type: String, trim: true, default: "" },
    monthlyIncome: { type: Number, min: 0 },
    bankName: { type: String, trim: true },
    accountNumber: { type: String, trim: true },
    branchCode: { type: String, trim: true },
    reference1Name: { type: String, trim: true, default: "" },
    reference1Phone: { type: String, trim: true, default: "" },
    reference2Name: { type: String, trim: true, default: "" },
    reference2Phone: { type: String, trim: true, default: "" },
    guarantorRelationship: { type: String, trim: true, default: "" },
    guarantorNationalId: { type: String, trim: true, default: "" },
    guarantorOccupation: { type: String, trim: true, default: "" },
    guarantorHomeVillage: { type: String, trim: true, default: "" },
    avatarUrl: { type: String, trim: true, default: "" },
    avatarPath: { type: String, trim: true, default: "" },
    documents: { type: [DocumentSchema], default: [] },
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
  },
  { timestamps: true }
);

export default mongoose.models.UserProfile || mongoose.model("UserProfile", UserProfileSchema);
