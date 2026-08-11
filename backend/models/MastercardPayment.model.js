import mongoose from "mongoose";
import { buildGatewayStorageSnapshot, sanitizeForLog } from "../utils/paymentSecurity.js";

const STATUS_ENUM = [
  "SESSION_CREATED",
  "PAYMENT_PROCESSING",
  "PAID",
  "FAILED",
  "CANCELLED",
  "UNKNOWN",
];

const MastercardPaymentSchema = new mongoose.Schema(
  {
    purpose: {
      type: String,
      enum: ["loan_repayment"],
      default: "loan_repayment",
      required: true,
      index: true,
    },
    accountId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "LoanAccount",
      required: true,
      index: true,
    },
    accountNumber: { type: String, trim: true, default: "", index: true },
    applicationCode: { type: String, trim: true, default: "", index: true },
    inquiryId: { type: mongoose.Schema.Types.ObjectId, ref: "LoanInquiry", default: null, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },

    customerName: { type: String, trim: true, default: "" },
    customerEmail: { type: String, trim: true, lowercase: true, default: "" },
    customerPhone: { type: String, trim: true, default: "" },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, trim: true, uppercase: true, default: "MWK" },
    description: { type: String, trim: true, default: "" },
    repaymentMonth: { type: Number, min: 1, default: null },
    repaymentType: {
      type: String,
      enum: ["next_due", "custom", "full_settlement"],
      default: "custom",
    },

    gatewayHost: { type: String, trim: true, default: "" },
    gatewayVersion: { type: String, trim: true, default: "" },
    merchantId: { type: String, trim: true, default: "" },
    sessionId: { type: String, trim: true, default: "", index: true },
    merchantOrderId: { type: String, trim: true, required: true, unique: true, index: true },
    transactionId: { type: String, trim: true, required: true, index: true },

    status: { type: String, enum: STATUS_ENUM, default: "SESSION_CREATED", index: true },
    gatewayResult: { type: String, trim: true, default: "" },
    gatewayMessage: { type: String, trim: true, default: "" },
    gatewayReceipt: { type: String, trim: true, default: "" },
    gatewayAuthorizationCode: { type: String, trim: true, default: "" },
    gatewayResponseCode: { type: String, trim: true, default: "" },

    recordedRepaymentEntryId: { type: mongoose.Schema.Types.ObjectId, default: null },
    recordedAt: { type: Date, default: null },

    createdPayload: { type: Object, default: null },
    createSessionResponse: { type: Object, default: null },
    payResponse: { type: Object, default: null },
    orderStatusResponse: { type: Object, default: null },
    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
  },
  { timestamps: true }
);


MastercardPaymentSchema.pre("validate", function sanitizeGatewayFields() {
  // Defence-in-depth: never persist raw cardholder data or raw gateway card/sourceOfFunds payloads.
  // This is intentionally synchronous. Do not call next(); newer Mongoose versions
  // may run this hook without a callback, which caused "next is not a function".
  this.createdPayload = sanitizeForLog(this.createdPayload);
  this.createSessionResponse = buildGatewayStorageSnapshot(this.createSessionResponse) || sanitizeForLog(this.createSessionResponse);
  this.payResponse = buildGatewayStorageSnapshot(this.payResponse) || sanitizeForLog(this.payResponse);
  this.orderStatusResponse = buildGatewayStorageSnapshot(this.orderStatusResponse) || sanitizeForLog(this.orderStatusResponse);
});

MastercardPaymentSchema.index({ accountId: 1, createdAt: -1 });
MastercardPaymentSchema.index({ status: 1, createdAt: -1 });

export const MastercardPayment =
  mongoose.models.MastercardPayment || mongoose.model("MastercardPayment", MastercardPaymentSchema);
