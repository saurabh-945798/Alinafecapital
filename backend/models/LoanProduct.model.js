import mongoose from "mongoose";

const LoanProductSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    category: {
      type: String,
      enum: [
        "Personal",
        "Private",
        "Business",
        "Agriculture",
        "Emergency Loan",
        "Government",
        "Public",
        "Education",
        "Group",
        "Asset Finance",
        "Digital Credit",
        "Other",
      ],
      default: "Private",
      trim: true,
    },
    description: { type: String, default: "" },

    currency: { type: String, default: "MWK" },

    minAmount: { type: Number, required: true, min: 0 },
    maxAmount: { type: Number, required: true, min: 0 },

    minTenureMonths: { type: Number, required: true, min: 1 },
    maxTenureMonths: { type: Number, required: true, min: 1 },

    interestType: { type: String, enum: ["flat", "reducing"], default: "reducing" },
    interestRateMonthly: { type: Number, required: true, min: 0 },

    // One-time charges applied at the beginning of the loan. These do not recur monthly.
    processingFeeType: { type: String, enum: ["flat", "percent"], default: "percent" },
    processingFeeValue: { type: Number, default: 2.5, min: 0 },
    adminFeeType: { type: String, enum: ["flat", "percent"], default: "percent" },
    adminFeeValue: { type: Number, default: 2.5, min: 0 },

    // Retained only for backwards compatibility with historical product records.
    loanAdministrationFeeMonthly: { type: Number, default: 0, min: 0 },

    // One-time penalty applied to an installment that was not cleared by its due date.
    overduePenaltyRatePercent: { type: Number, default: 15, min: 0 },

    insuranceType: { type: String, enum: ["none", "flat", "percent"], default: "none" },
    insuranceValue: { type: Number, default: 0, min: 0 },

    taxRatePercent: { type: Number, default: 0, min: 0 },

    repaymentFrequency: { type: String, enum: ["monthly"], default: "monthly" },

    status: { type: String, enum: ["active", "inactive"], default: "active" },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

LoanProductSchema.index({ status: 1, featured: 1 });
LoanProductSchema.index({ minAmount: 1, maxAmount: 1 });

export const LoanProduct =
  mongoose.models.LoanProduct || mongoose.model("LoanProduct", LoanProductSchema);
