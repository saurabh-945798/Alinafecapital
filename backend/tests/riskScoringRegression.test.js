import test from "node:test";
import assert from "node:assert/strict";
import { calculateRiskResult, validateRiskWeights } from "../utils/riskScoring.js";

test("risk model keeps configured weights at 100 points", () => {
  const weights = validateRiskWeights();
  assert.equal(Object.values(weights).reduce((sum, value) => sum + value, 0), 100);
});

test("80 points or more is low risk / recommend", () => {
  const result = calculateRiskResult({ scores: { repaymentCapacity:20, collateralQuality:20, collateralCoverage:12, suretyStrength:12, financialPosition:8, documentationCompleteness:8, additionalRisk:4 } });
  assert.equal(result.scoreTotal, 84);
  assert.equal(result.classification, "LOW_RISK");
  assert.equal(result.suggestedRecommendation, "RECOMMEND");
});

test("moderate, high and below-50 classifications follow the agreed thresholds", () => {
  const base=(total)=>({ repaymentCapacity:Math.min(20,total), collateralQuality:Math.min(25,Math.max(0,total-20)), collateralCoverage:Math.min(15,Math.max(0,total-45)), suretyStrength:Math.min(15,Math.max(0,total-60)), financialPosition:Math.min(10,Math.max(0,total-75)), documentationCompleteness:Math.min(10,Math.max(0,total-85)), additionalRisk:Math.min(5,Math.max(0,total-95)) });
  assert.equal(calculateRiskResult({scores:base(70)}).classification,"MODERATE_RISK");
  assert.equal(calculateRiskResult({scores:base(55)}).classification,"HIGH_RISK");
  assert.equal(calculateRiskResult({scores:base(49)}).classification,"NOT_RECOMMENDED");
});

test("a score cannot exceed the configured category maximum", () => {
  assert.throws(() => calculateRiskResult({ scores: { repaymentCapacity: 21 } }), /between 0 and 20/);
});
