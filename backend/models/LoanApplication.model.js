import mongoose from "mongoose";

const STATUS_ENUM = [
  "PRE_APPLICATION",
  "SUBMITTED",
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "DISBURSED",
  "CANCELLED",
];

const LoanApplicationSchema = new mongoose.Schema(
  {
    // ==============================
    // 👤 Applicant Details
    // ==============================
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },

    monthlyIncome: {
      type: Number,
      required: true,
      min: 0,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      index: true,
      default: null,
    },

    // ==============================
    // 🏦 Product Selection
    // ==============================
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoanProduct",
      required: true,
      index: true,
    },

    productSlug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    // ==============================
    // 💰 Requested Values
    // ==============================
    requestedAmount: {
      type: Number,
      required: true,
      min: 0,
    },

    tenureMonths: {
      type: Number,
      required: true,
      min: 1,
    },

    // ==============================
    // 📸 Snapshots (CRITICAL FOR FINTECH)
    // ==============================
    productSnapshot: {
      type: Object,
      required: true,
    },

    calculationSnapshot: {
      type: Object,
      required: true,
    },

    // ==============================
    // 🔁 Workflow Status
    // ==============================
    status: {
      type: String,
      enum: STATUS_ENUM,
      default: "PENDING",
      index: true,
    },

    precheckReason: {
      type: String,
      enum: ["", "PROFILE_INCOMPLETE", "KYC_PENDING", "KYC_REJECTED"],
      default: "",
      trim: true,
    },

    // Status history log (audit trail)
    statusHistory: [
      {
        status: {
          type: String,
          enum: STATUS_ENUM,
        },
        note: {
          type: String,
          default: "",
        },
        reasonCode: {
          type: String,
          default: "",
          trim: true,
          uppercase: true,
        },
        updatedBy: {
          type: String,
          default: "",
          trim: true,
        },
        updatedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ==============================
    // 📝 Admin Notes
    // ==============================
    notes: {
      type: String,
      default: "",
    },

    disbursement: {
      reference: { type: String, trim: true, default: "" },
      amount: { type: Number, min: 0, default: 0 },
      disbursedAt: { type: Date, default: null },
      note: { type: String, trim: true, default: "" },
      updatedBy: { type: String, trim: true, default: "" },
      updatedAt: { type: Date, default: null },
    },
  },
  {
    timestamps: true,
  }
);

// ==============================
// 🔍 Indexes (Performance)
// ==============================

LoanApplicationSchema.index({ phone: 1, createdAt: -1 });
LoanApplicationSchema.index({ productSlug: 1, createdAt: -1 });
LoanApplicationSchema.index({ status: 1, createdAt: -1 });
LoanApplicationSchema.index({ userId: 1, createdAt: -1 });

// ==============================
// 🧠 Auto-add first status history
// ==============================

LoanApplicationSchema.pre("save", function () {
  if (this.isNew && this.statusHistory.length === 0) {
    this.statusHistory.push({
      status: this.status,
      note: "Application created",
      reasonCode: "CREATED",
      updatedBy: "system",
      updatedAt: new Date(),
    });
  }
});

export const LoanApplication =
  mongoose.models.LoanApplication ||
  mongoose.model("LoanApplication", LoanApplicationSchema);



