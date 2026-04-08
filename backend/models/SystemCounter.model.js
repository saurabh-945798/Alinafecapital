import mongoose from "mongoose";

const SystemCounterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true },
    value: { type: Number, required: true, default: 0, min: 0 },
  },
  { timestamps: true }
);

export const SystemCounter =
  mongoose.models.SystemCounter || mongoose.model("SystemCounter", SystemCounterSchema);
