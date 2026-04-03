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

    processingFeeType: { type: String, enum: ["flat", "percent"], default: "percent" },
    processingFeeValue: { type: Number, default: 0, min: 0 },
    loanAdministrationFeeMonthly: { type: Number, default: 0, min: 0 },

    insuranceType: { type: String, enum: ["none", "flat", "percent"], default: "none" },
    insuranceValue: { type: Number, default: 0, min: 0 },

    taxRatePercent: { type: Number, default: 0, min: 0 },

    repaymentFrequency: { type: String, enum: ["monthly"], default: "monthly" },

    status: { type: String, enum: ["active", "inactive"], default: "active" },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// helpful indexes
LoanProductSchema.index({ status: 1, featured: 1 });
LoanProductSchema.index({ minAmount: 1, maxAmount: 1 });

export const LoanProduct =
  mongoose.models.LoanProduct || mongoose.model("LoanProduct", LoanProductSchema);
