import mongoose from "mongoose";

const RiskAssessmentConfigSchema = new mongoose.Schema(
  {
    key: { type: String, default: "default", unique: true, index: true },
    weights: {
      repaymentCapacity: { type: Number, min: 0, default: 20 },
      collateralQuality: { type: Number, min: 0, default: 25 },
      collateralCoverage: { type: Number, min: 0, default: 15 },
      suretyStrength: { type: Number, min: 0, default: 15 },
      financialPosition: { type: Number, min: 0, default: 10 },
      documentationCompleteness: { type: Number, min: 0, default: 10 },
      additionalRisk: { type: Number, min: 0, default: 5 },
    },
    thresholds: {
      lowRiskMin: { type: Number, min: 0, max: 100, default: 80 },
      moderateRiskMin: { type: Number, min: 0, max: 100, default: 65 },
      highRiskMin: { type: Number, min: 0, max: 100, default: 50 },
    },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
);

export const RiskAssessmentConfig =
  mongoose.models.RiskAssessmentConfig ||
  mongoose.model("RiskAssessmentConfig", RiskAssessmentConfigSchema);
