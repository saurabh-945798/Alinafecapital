import mongoose from "mongoose";

const ComplaintSchema = new mongoose.Schema(
  {
    complaintCode: {
      type: String,
      trim: true,
      unique: true,
      sparse: true,
      index: true,
    },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true, default: "" },
    subject: { type: String, required: true, trim: true },
    message: { type: String, required: true, trim: true },
    preferredContact: {
      type: String,
      enum: ["phone", "email", "whatsapp"],
      default: "phone",
    },
    status: {
      type: String,
      enum: ["NEW", "IN_REVIEW", "RESOLVED", "CLOSED"],
      default: "NEW",
      index: true,
    },
    adminNote: { type: String, trim: true, default: "" },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

ComplaintSchema.index({ createdAt: -1 });
ComplaintSchema.index({ status: 1, createdAt: -1 });

export const Complaint =
  mongoose.models.Complaint || mongoose.model("Complaint", ComplaintSchema);
