import { RiskAssessmentConfig } from "../models/RiskAssessmentConfig.model.js";
import {
  DEFAULT_RISK_WEIGHTS,
  DEFAULT_RISK_THRESHOLDS,
  validateRiskWeights,
  validateRiskThresholds,
  calculateRiskResult,
} from "../utils/riskScoring.js";

export { DEFAULT_RISK_WEIGHTS, DEFAULT_RISK_THRESHOLDS, validateRiskWeights, validateRiskThresholds, calculateRiskResult };

export const getRiskConfig = async () => {
  let config = await RiskAssessmentConfig.findOne({ key: "default" });
  if (!config) {
    config = await RiskAssessmentConfig.create({ key: "default", weights: DEFAULT_RISK_WEIGHTS, thresholds: DEFAULT_RISK_THRESHOLDS });
  }
  return config;
};
