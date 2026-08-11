import mongoose from "mongoose";

const STATUS_ENUM = ["INITIATED", "PENDING", "PAID", "FAILED", "CANCELLED", "UNKNOWN"];

const AirtelPaymentSchema = new mongoose.Schema(
  {
    purpose: {
      type: String,
      enum: ["loan_repayment"],
      default: "loan_repayment",
      required: true,
      index: true,
    },
    accountId: { type: mongoose.Schema.Types.ObjectId, ref: "LoanAccount", required: true, index: true },
    accountNumber: { type: String, trim: true, default: "", index: true },
    applicationCode: { type: String, trim: true, default: "", index: true },
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "LoanInquiry", default: null, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },

    customerName: { type: String, trim: true, default: "" },
    customerEmail: { type: String, trim: true, lowercase: true, default: "" },
    customerPhone: { type: String, trim: true, default: "" },
    airtelPhone: { type: String, trim: true, default: "" },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true, uppercase: true, default: "MWK" },
    country: { type: String, required: true, trim: true, uppercase: true, default: "MW" },
    description: { type: String, trim: true, default: "" },
    repaymentMonth: { type: Number, min: 1, default: null },
    repaymentType: {
      type: String,
      enum: ["next_due", "custom", "full_settlement"],
      default: "custom",
    },

    provider: { type: String, trim: true, default: "airtel_money", index: true },
    gatewayHost: { type: String, trim: true, default: "" },
    merchantWalletNumber: { type: String, trim: true, default: "" },
    reference: { type: String, trim: true, required: true, unique: true, index: true },
    transactionId: { type: String, trim: true, required: true, index: true },
    airtelMoneyId: { type: String, trim: true, default: "", index: true },

    status: { type: String, enum: STATUS_ENUM, default: "INITIATED", index: true },
    gatewayResult: { type: String, trim: true, default: "" },
    gatewayMessage: { type: String, trim: true, default: "" },
    gatewayResponseCode: { type: String, trim: true, default: "" },

    recordedRepaymentEntryId: { type: mongoose.Schema.Types.ObjectId, default: null },
    recordedAt: { type: Date, default: null },

    requestPayload: { type: Object, default: null },
    initiateResponse: { type: Object, default: null },
    statusResponse: { type: Object, default: null },
    callbackResponse: { type: Object, default: null },
    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

AirtelPaymentSchema.index({ accountId: 1, createdAt: -1 });
AirtelPaymentSchema.index({ status: 1, createdAt: -1 });

export const AirtelPayment = mongoose.models.AirtelPayment || mongoose.model("AirtelPayment", AirtelPaymentSchema);
