import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireRole } from "../middlewares/requireRole.js";
import { strictAdminWriteLimiter } from "../middlewares/rateLimiters.js";
import { riskAssessmentController } from "../controllers/riskAssessment.controller.js";

const router = Router();
const readRoles = ["SUPER_ADMIN", "RISK_ANALYST", "APPROVAL", "AUTHORIZED", "AUDITOR"];

router.get("/risk/config", requireRole(...readRoles), asyncHandler(riskAssessmentController.getConfig));
router.patch(
  "/risk/config",
  requireRole("SUPER_ADMIN"),
  strictAdminWriteLimiter,
  asyncHandler(riskAssessmentController.updateConfig)
);
router.get("/risk/queue", requireRole(...readRoles), asyncHandler(riskAssessmentController.queue));
router.get("/risk/assessments", requireRole(...readRoles), asyncHandler(riskAssessmentController.list));
router.get(
  "/risk/assessments/:applicationId",
  requireRole(...readRoles),
  asyncHandler(riskAssessmentController.getByApplication)
);
router.put(
  "/risk/assessments/:applicationId",
  requireRole("SUPER_ADMIN", "RISK_ANALYST"),
  strictAdminWriteLimiter,
  asyncHandler(riskAssessmentController.saveDraft)
);
router.post(
  "/risk/assessments/:applicationId/submit",
  requireRole("SUPER_ADMIN", "RISK_ANALYST"),
  strictAdminWriteLimiter,
  asyncHandler(riskAssessmentController.submit)
);
router.post(
  "/risk/assessments/:applicationId/reopen",
  requireRole("SUPER_ADMIN"),
  strictAdminWriteLimiter,
  asyncHandler(riskAssessmentController.reopen)
);

export default router;
