import mongoose from "mongoose";

const AdminAuditLogSchema = new mongoose.Schema(
  {
    actorUserId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    actorEmail: { type: String, trim: true, default: "" },
    actorRole: { type: String, trim: true, default: "" },
    action: { type: String, trim: true, required: true, index: true },
    targetType: { type: String, trim: true, required: true, index: true },
    targetId: { type: String, trim: true, required: true, index: true },
    oldValue: { type: mongoose.Schema.Types.Mixed, default: null },
    newValue: { type: mongoose.Schema.Types.Mixed, default: null },
    ipAddress: { type: String, trim: true, default: "" },
  },
  { timestamps: true }
);

AdminAuditLogSchema.index({ createdAt: -1, action: 1 });

export const AdminAuditLog =
  mongoose.models.AdminAuditLog || mongoose.model("AdminAuditLog", AdminAuditLogSchema);
