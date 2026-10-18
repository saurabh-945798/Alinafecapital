import mongoose from "mongoose";

const ScoreSchema = new mongoose.Schema(
  {
    repaymentCapacity: { type: Number, min: 0, default: 0 },
    collateralQuality: { type: Number, min: 0, default: 0 },
    collateralCoverage: { type: Number, min: 0, default: 0 },
    suretyStrength: { type: Number, min: 0, default: 0 },
    financialPosition: { type: Number, min: 0, default: 0 },
    documentationCompleteness: { type: Number, min: 0, default: 0 },
    additionalRisk: { type: Number, min: 0, default: 0 },
  },
  { _id: false }
);

const SecurityAssessmentSchema = new mongoose.Schema(
  {
    securityType: { type: String, trim: true, default: "" },
    description: { type: String, trim: true, default: "" },
    ownership: { type: String, trim: true, default: "" },
    estimatedValue: { type: Number, min: 0, default: 0 },
    verifiedValue: { type: Number, min: 0, default: 0 },
    forcedSaleValue: { type: Number, min: 0, default: 0 },
    coveragePercent: { type: Number, min: 0, default: 0 },
    condition: { type: String, trim: true, default: "" },
    verificationNotes: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const SuretyAssessmentSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true, default: "" },
    relationship: { type: String, trim: true, default: "" },
    income: { type: Number, min: 0, default: 0 },
    obligations: { type: Number, min: 0, default: 0 },
    occupation: { type: String, trim: true, default: "" },
    verificationStatus: { type: String, trim: true, default: "" },
    notes: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const ReopenSchema = new mongoose.Schema(
  {
    reason: { type: String, required: true, trim: true },
    reopenedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    reopenedByName: { type: String, trim: true, default: "" },
    reopenedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const RiskAssessmentSchema = new mongoose.Schema(
  {
    applicationType: {
      type: String,
      enum: ["INQUIRY", "APPLICATION"],
      default: "INQUIRY",
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    loanAccountId: { type: mongoose.Schema.Types.ObjectId, ref: "LoanAccount", default: null },
    analystId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    analystName: { type: String, trim: true, default: "" },
    analystEmail: { type: String, trim: true, default: "" },
    scores: { type: ScoreSchema, default: () => ({}) },
    weightsSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    thresholdsSnapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    scoreTotal: { type: Number, min: 0, max: 100, default: 0, index: true },
    classification: {
      type: String,
      enum: ["LOW_RISK", "MODERATE_RISK", "HIGH_RISK", "NOT_RECOMMENDED"],
      default: "NOT_RECOMMENDED",
      index: true,
    },
    recommendation: {
      type: String,
      enum: ["", "RECOMMEND", "RECOMMEND_WITH_CONDITIONS", "REFER_FOR_FURTHER_REVIEW", "DO_NOT_RECOMMEND"],
      default: "",
      index: true,
    },
    security: { type: SecurityAssessmentSchema, default: () => ({}) },
    surety: { type: SuretyAssessmentSchema, default: () => ({}) },
    repaymentCapacityNotes: { type: String, trim: true, default: "" },
    customerFinancialPosition: { type: String, trim: true, default: "" },
    legalDocumentNotes: { type: String, trim: true, default: "" },
    strengths: { type: [String], default: [] },
    weaknesses: { type: [String], default: [] },
    identifiedRisks: { type: [String], default: [] },
    conditions: { type: [String], default: [] },
    additionalSecurityRequired: { type: String, trim: true, default: "" },
    analystComments: { type: String, trim: true, default: "" },
    status: { type: String, enum: ["DRAFT", "SUBMITTED"], default: "DRAFT", index: true },
    submittedAt: { type: Date, default: null },
    reopenedHistory: { type: [ReopenSchema], default: [] },
  },
  { timestamps: true }
);

RiskAssessmentSchema.index({ applicationType: 1, applicationId: 1 }, { unique: true });
RiskAssessmentSchema.index({ status: 1, updatedAt: -1 });

export const RiskAssessment =
  mongoose.models.RiskAssessment || mongoose.model("RiskAssessment", RiskAssessmentSchema);
