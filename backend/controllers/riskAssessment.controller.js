import mongoose from "mongoose";
import { z } from "zod";
import { RiskAssessment } from "../models/RiskAssessment.model.js";
import { RiskAssessmentConfig } from "../models/RiskAssessmentConfig.model.js";
import { LoanInquiry } from "../models/LoanInquiry.model.js";
import { LoanApplication } from "../models/LoanApplication.model.js";
import { LoanAccount } from "../models/LoanAccount.model.js";
import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";
import { writeAdminAudit } from "../utils/adminAudit.js";
import { normalizeRole } from "../utils/rbac.js";
import {
  calculateRiskResult,
  getRiskConfig,
  validateRiskThresholds,
  validateRiskWeights,
} from "../services/riskAssessment.service.js";

const RECOMMENDATIONS = [
  "RECOMMEND",
  "RECOMMEND_WITH_CONDITIONS",
  "REFER_FOR_FURTHER_REVIEW",
  "DO_NOT_RECOMMEND",
];

const scoreSchema = z.object({
  repaymentCapacity: z.coerce.number().min(0),
  collateralQuality: z.coerce.number().min(0),
  collateralCoverage: z.coerce.number().min(0),
  suretyStrength: z.coerce.number().min(0),
  financialPosition: z.coerce.number().min(0),
  documentationCompleteness: z.coerce.number().min(0),
  additionalRisk: z.coerce.number().min(0),
});

const textArray = z.union([z.array(z.string()), z.string()]).optional();
const assessmentSchema = z.object({
  applicationType: z.enum(["INQUIRY", "APPLICATION"]).default("INQUIRY"),
  scores: scoreSchema,
  security: z
    .object({
      securityType: z.string().trim().max(120).optional(),
      description: z.string().trim().max(2000).optional(),
      ownership: z.string().trim().max(500).optional(),
      estimatedValue: z.coerce.number().min(0).optional(),
      verifiedValue: z.coerce.number().min(0).optional(),
      forcedSaleValue: z.coerce.number().min(0).optional(),
      coveragePercent: z.coerce.number().min(0).optional(),
      condition: z.string().trim().max(1000).optional(),
      verificationNotes: z.string().trim().max(2000).optional(),
    })
    .optional(),
  surety: z
    .object({
      name: z.string().trim().max(200).optional(),
      relationship: z.string().trim().max(120).optional(),
      income: z.coerce.number().min(0).optional(),
      obligations: z.coerce.number().min(0).optional(),
      occupation: z.string().trim().max(200).optional(),
      verificationStatus: z.string().trim().max(120).optional(),
      notes: z.string().trim().max(2000).optional(),
    })
    .optional(),
  repaymentCapacityNotes: z.string().trim().max(3000).optional(),
  customerFinancialPosition: z.string().trim().max(3000).optional(),
  legalDocumentNotes: z.string().trim().max(3000).optional(),
  strengths: textArray,
  weaknesses: textArray,
  identifiedRisks: textArray,
  conditions: textArray,
  additionalSecurityRequired: z.string().trim().max(3000).optional(),
  analystComments: z.string().trim().max(5000).optional(),
  recommendation: z.enum(RECOMMENDATIONS).optional(),
});

const configSchema = z.object({
  weights: z.object({
    repaymentCapacity: z.coerce.number().min(0),
    collateralQuality: z.coerce.number().min(0),
    collateralCoverage: z.coerce.number().min(0),
    suretyStrength: z.coerce.number().min(0),
    financialPosition: z.coerce.number().min(0),
    documentationCompleteness: z.coerce.number().min(0),
    additionalRisk: z.coerce.number().min(0),
  }),
  thresholds: z.object({
    lowRiskMin: z.coerce.number().min(0).max(100),
    moderateRiskMin: z.coerce.number().min(0).max(100),
    highRiskMin: z.coerce.number().min(0).max(100),
  }),
});

const toLines = (value) => {
  if (Array.isArray(value)) return value.map((v) => String(v || "").trim()).filter(Boolean);
  return String(value || "")
    .split(/\r?\n/)
    .map((v) => v.trim())
    .filter(Boolean);
};

const assertObjectId = (id) => {
  if (!mongoose.Types.ObjectId.isValid(id)) {
    const error = new Error("Invalid application id");
    error.statusCode = 400;
    throw error;
  }
};

const getApplication = async (applicationType, applicationId) => {
  assertObjectId(applicationId);
  if (applicationType === "APPLICATION") return LoanApplication.findById(applicationId).lean();
  return LoanInquiry.findById(applicationId).lean();
};

const resolveApplicantUser = async (application) => {
  if (!application) return null;
  if (application.userId) return User.findById(application.userId).lean();
  const or = [];
  if (application.email) or.push({ email: String(application.email).trim().toLowerCase() });
  if (application.phone) or.push({ phone: application.phone });
  return or.length ? User.findOne({ $or: or }).lean() : null;
};

const buildApplicationSnapshot = async (type, application) => {
  const user = await resolveApplicantUser(application);
  const profile = user ? await UserProfile.findOne({ userId: user._id }).lean() : null;
  let account = null;
  if (type === "INQUIRY" && application?.loanAccountId) {
    account = await LoanAccount.findById(application.loanAccountId).lean();
  } else if (user?._id) {
    account = await LoanAccount.findOne({ userId: user._id }).sort({ createdAt: -1 }).lean();
  }

  return {
    applicationType: type,
    applicationId: String(application?._id || ""),
    applicationCode: application?.applicationCode || String(application?._id || ""),
    customer: {
      userId: user?._id || application?.userId || null,
      fullName: application?.fullName || user?.fullName || profile?.fullName || "",
      email: application?.email || user?.email || profile?.email || "",
      phone: application?.phone || user?.phone || profile?.phone || "",
      monthlyIncome: Number(application?.monthlyIncome || profile?.monthlyIncome || 0),
      employmentType: profile?.employmentType || application?.employmentType || "",
      kycStatus: profile?.kycStatus || application?.kycStatus || "not_started",
    },
    loan: {
      productName: application?.loanProductName || application?.productSnapshot?.name || application?.productSlug || application?.loanProductSlug || "",
      requestedAmount: Number(application?.requestedAmount || 0),
      tenureMonths: Number(application?.preferredTenureMonths || application?.tenureMonths || 0),
      status: application?.status || "",
      outstandingBalance: Number(account?.outstandingBalance || 0),
    },
    security: {
      declared: application?.collateral || "",
      guarantorName: application?.reference1Name || profile?.reference1Name || "",
      guarantorRelationship: application?.guarantorRelationship || profile?.guarantorRelationship || "",
      guarantorOccupation: application?.guarantorOccupation || profile?.guarantorOccupation || "",
    },
  };
};

const getAssessmentOrCreate = async ({ applicationType, applicationId, req }) => {
  const application = await getApplication(applicationType, applicationId);
  if (!application) {
    const error = new Error("Application not found");
    error.statusCode = 404;
    throw error;
  }
  const user = await resolveApplicantUser(application);
  let assessment = await RiskAssessment.findOne({ applicationType, applicationId });
  if (!assessment) {
    assessment = new RiskAssessment({
      applicationType,
      applicationId,
      userId: user?._id || application?.userId || null,
      loanAccountId: application?.loanAccountId || null,
      analystId: req.user?._id || null,
      analystName: req.user?.fullName || "",
      analystEmail: req.user?.email || "",
    });
  }
  return { assessment, application };
};

const serializeAssessment = async (doc, { includeApplication = true } = {}) => {
  const obj = doc?.toObject ? doc.toObject() : doc;
  if (!obj) return null;
  if (!includeApplication) return obj;
  const application = await getApplication(obj.applicationType, obj.applicationId);
  return {
    ...obj,
    application: application ? await buildApplicationSnapshot(obj.applicationType, application) : null,
  };
};

const saveAssessment = async ({ assessment, application, payload, req, submit = false }) => {
  if (assessment.status === "SUBMITTED") {
    const error = new Error("Submitted risk assessments are read-only. A Super Admin must reopen it first.");
    error.statusCode = 409;
    throw error;
  }

  const config = await getRiskConfig();
  const weights = config.weights?.toObject ? config.weights.toObject() : config.weights;
  const thresholds = config.thresholds?.toObject ? config.thresholds.toObject() : config.thresholds;
  const result = calculateRiskResult({ scores: payload.scores, weights, thresholds });

  assessment.userId = assessment.userId || application?.userId || null;
  assessment.loanAccountId = assessment.loanAccountId || application?.loanAccountId || null;
  assessment.analystId = req.user?._id || assessment.analystId || null;
  assessment.analystName = req.user?.fullName || assessment.analystName || "";
  assessment.analystEmail = req.user?.email || assessment.analystEmail || "";
  assessment.scores = result.normalizedScores;
  assessment.weightsSnapshot = weights;
  assessment.thresholdsSnapshot = thresholds;
  assessment.scoreTotal = result.scoreTotal;
  assessment.classification = result.classification;
  assessment.security = payload.security || assessment.security || {};
  assessment.surety = payload.surety || assessment.surety || {};
  assessment.repaymentCapacityNotes = payload.repaymentCapacityNotes || "";
  assessment.customerFinancialPosition = payload.customerFinancialPosition || "";
  assessment.legalDocumentNotes = payload.legalDocumentNotes || "";
  assessment.strengths = toLines(payload.strengths);
  assessment.weaknesses = toLines(payload.weaknesses);
  assessment.identifiedRisks = toLines(payload.identifiedRisks);
  assessment.conditions = toLines(payload.conditions);
  assessment.additionalSecurityRequired = payload.additionalSecurityRequired || "";
  assessment.analystComments = payload.analystComments || "";
  assessment.recommendation = payload.recommendation || result.suggestedRecommendation;

  if (submit) {
    if (!String(assessment.analystComments || "").trim()) {
      const error = new Error("Analyst comments are required before submitting the risk report");
      error.statusCode = 400;
      throw error;
    }
    if (!RECOMMENDATIONS.includes(assessment.recommendation)) {
      const error = new Error("A final recommendation is required before submitting the risk report");
      error.statusCode = 400;
      throw error;
    }
    assessment.status = "SUBMITTED";
    assessment.submittedAt = new Date();
  }

  await assessment.save();
  await writeAdminAudit(req, {
    action: submit ? "RISK_ASSESSMENT_SUBMITTED" : "RISK_ASSESSMENT_SAVED",
    targetType: "RiskAssessment",
    targetId: assessment._id,
    newValue: {
      applicationType: assessment.applicationType,
      applicationId: assessment.applicationId,
      scoreTotal: assessment.scoreTotal,
      classification: assessment.classification,
      recommendation: assessment.recommendation,
      status: assessment.status,
    },
  });
  return assessment;
};

export const riskAssessmentController = {
  getConfig: async (req, res) => {
    const config = await getRiskConfig();
    return res.json({ success: true, data: config.toObject() });
  },

  updateConfig: async (req, res) => {
    const parsed = configSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Validation failed", details: parsed.error.issues });
    }
    let weights;
    let thresholds;
    try {
      weights = validateRiskWeights(parsed.data.weights);
      thresholds = validateRiskThresholds(parsed.data.thresholds);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message, code: "INVALID_RISK_CONFIG" });
    }
    const config = await RiskAssessmentConfig.findOneAndUpdate(
      { key: "default" },
      { $set: { weights, thresholds, updatedBy: req.user?._id || null } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    await writeAdminAudit(req, {
      action: "RISK_CONFIG_UPDATED",
      targetType: "RiskAssessmentConfig",
      targetId: config._id,
      newValue: { weights, thresholds },
    });
    return res.json({ success: true, data: config.toObject() });
  },

  list: async (req, res) => {
    const status = String(req.query.status || "").trim().toUpperCase();
    const filter = status && status !== "ALL" ? { status } : {};
    const assessments = await RiskAssessment.find(filter).sort({ updatedAt: -1 }).limit(200).lean();
    const data = await Promise.all(assessments.map((item) => serializeAssessment(item)));
    return res.json({ success: true, data: { items: data } });
  },

  queue: async (req, res) => {
    const inquiries = await LoanInquiry.find({
      status: { $nin: ["CLOSED"] },
      kycStatus: "verified",
    })
      .sort({ updatedAt: -1 })
      .limit(200)
      .lean();
    const ids = inquiries.map((item) => item._id);
    const assessments = ids.length
      ? await RiskAssessment.find({ applicationType: "INQUIRY", applicationId: { $in: ids } }).lean()
      : [];
    const map = new Map(assessments.map((item) => [String(item.applicationId), item]));
    const items = await Promise.all(
      inquiries.map(async (item) => ({
        ...(await buildApplicationSnapshot("INQUIRY", item)),
        riskAssessment: map.get(String(item._id)) || null,
      }))
    );
    return res.json({ success: true, data: { items } });
  },

  getByApplication: async (req, res) => {
    const applicationType = String(req.query.type || "INQUIRY").toUpperCase();
    if (!["INQUIRY", "APPLICATION"].includes(applicationType)) {
      return res.status(400).json({ success: false, message: "Invalid application type" });
    }
    assertObjectId(req.params.applicationId);
    const application = await getApplication(applicationType, req.params.applicationId);
    if (!application) return res.status(404).json({ success: false, message: "Application not found" });
    const assessment = await RiskAssessment.findOne({ applicationType, applicationId: req.params.applicationId }).lean();
    return res.json({
      success: true,
      data: {
        assessment: assessment || null,
        application: await buildApplicationSnapshot(applicationType, application),
        config: (await getRiskConfig()).toObject(),
      },
    });
  },

  saveDraft: async (req, res) => {
    const parsed = assessmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Validation failed", details: parsed.error.issues });
    }
    const role = normalizeRole(req.user?.role);
    if (!["SUPER_ADMIN", "RISK_ANALYST"].includes(role)) {
      return res.status(403).json({ success: false, message: "Only Risk Analysts can edit risk assessments" });
    }
    const { assessment, application } = await getAssessmentOrCreate({
      applicationType: parsed.data.applicationType,
      applicationId: req.params.applicationId,
      req,
    });
    try {
      await saveAssessment({ assessment, application, payload: parsed.data, req, submit: false });
    } catch (error) {
      return res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
    return res.json({ success: true, data: await serializeAssessment(assessment) });
  },

  submit: async (req, res) => {
    const parsed = assessmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, message: "Validation failed", details: parsed.error.issues });
    }
    const role = normalizeRole(req.user?.role);
    if (!["SUPER_ADMIN", "RISK_ANALYST"].includes(role)) {
      return res.status(403).json({ success: false, message: "Only Risk Analysts can submit risk assessments" });
    }
    const { assessment, application } = await getAssessmentOrCreate({
      applicationType: parsed.data.applicationType,
      applicationId: req.params.applicationId,
      req,
    });
    try {
      await saveAssessment({ assessment, application, payload: parsed.data, req, submit: true });
    } catch (error) {
      return res.status(error.statusCode || 400).json({ success: false, message: error.message });
    }
    return res.json({ success: true, data: await serializeAssessment(assessment) });
  },

  reopen: async (req, res) => {
    const reason = String(req.body?.reason || "").trim();
    if (reason.length < 5) {
      return res.status(400).json({ success: false, message: "A reason is required to reopen a submitted risk assessment" });
    }
    assertObjectId(req.params.applicationId);
    const applicationType = String(req.body?.applicationType || "INQUIRY").toUpperCase();
    const assessment = await RiskAssessment.findOne({ applicationType, applicationId: req.params.applicationId });
    if (!assessment) return res.status(404).json({ success: false, message: "Risk assessment not found" });
    assessment.status = "DRAFT";
    assessment.submittedAt = null;
    assessment.reopenedHistory.push({
      reason,
      reopenedBy: req.user?._id || null,
      reopenedByName: req.user?.fullName || req.user?.email || "Super Admin",
      reopenedAt: new Date(),
    });
    await assessment.save();
    await writeAdminAudit(req, {
      action: "RISK_ASSESSMENT_REOPENED",
      targetType: "RiskAssessment",
      targetId: assessment._id,
      oldValue: { status: "SUBMITTED" },
      newValue: { status: "DRAFT", reason },
    });
    return res.json({ success: true, data: await serializeAssessment(assessment) });
  },
};
