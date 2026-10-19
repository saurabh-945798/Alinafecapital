export const DEFAULT_RISK_WEIGHTS = {
  repaymentCapacity: 20,
  collateralQuality: 25,
  collateralCoverage: 15,
  suretyStrength: 15,
  financialPosition: 10,
  documentationCompleteness: 10,
  additionalRisk: 5,
};

export const DEFAULT_RISK_THRESHOLDS = { lowRiskMin: 80, moderateRiskMin: 65, highRiskMin: 50 };

export const validateRiskWeights = (weights = {}) => {
  const normalized = {};
  let total = 0;
  for (const [key, fallback] of Object.entries(DEFAULT_RISK_WEIGHTS)) {
    const value = Number(weights?.[key] ?? fallback);
    if (!Number.isFinite(value) || value < 0 || value > 100) throw new Error(`Invalid risk weight for ${key}`);
    normalized[key] = value;
    total += value;
  }
  if (Math.abs(total - 100) > 0.001) throw new Error("Risk assessment weights must total 100 points");
  return normalized;
};

export const validateRiskThresholds = (thresholds = {}) => {
  const normalized = {
    lowRiskMin: Number(thresholds.lowRiskMin ?? DEFAULT_RISK_THRESHOLDS.lowRiskMin),
    moderateRiskMin: Number(thresholds.moderateRiskMin ?? DEFAULT_RISK_THRESHOLDS.moderateRiskMin),
    highRiskMin: Number(thresholds.highRiskMin ?? DEFAULT_RISK_THRESHOLDS.highRiskMin),
  };
  const { lowRiskMin, moderateRiskMin, highRiskMin } = normalized;
  if (![lowRiskMin, moderateRiskMin, highRiskMin].every((v) => Number.isFinite(v) && v >= 0 && v <= 100) || !(lowRiskMin > moderateRiskMin && moderateRiskMin > highRiskMin)) {
    throw new Error("Risk thresholds must be ordered low-risk > moderate-risk > high-risk");
  }
  return normalized;
};

export const calculateRiskResult = ({ scores = {}, weights = DEFAULT_RISK_WEIGHTS, thresholds = DEFAULT_RISK_THRESHOLDS }) => {
  const safeWeights = validateRiskWeights(weights);
  const safeThresholds = validateRiskThresholds(thresholds);
  const normalizedScores = {};
  let scoreTotal = 0;
  for (const [key, maxValue] of Object.entries(safeWeights)) {
    const value = Number(scores?.[key] ?? 0);
    if (!Number.isFinite(value) || value < 0 || value > maxValue) throw new Error(`${key} score must be between 0 and ${maxValue}`);
    normalizedScores[key] = value;
    scoreTotal += value;
  }
  scoreTotal = Math.round(scoreTotal * 100) / 100;
  let classification = "NOT_RECOMMENDED";
  let suggestedRecommendation = "DO_NOT_RECOMMEND";
  if (scoreTotal >= safeThresholds.lowRiskMin) { classification = "LOW_RISK"; suggestedRecommendation = "RECOMMEND"; }
  else if (scoreTotal >= safeThresholds.moderateRiskMin) { classification = "MODERATE_RISK"; suggestedRecommendation = "RECOMMEND_WITH_CONDITIONS"; }
  else if (scoreTotal >= safeThresholds.highRiskMin) { classification = "HIGH_RISK"; suggestedRecommendation = "REFER_FOR_FURTHER_REVIEW"; }
  return { normalizedScores, scoreTotal, classification, suggestedRecommendation };
};
