import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireRole } from "../middlewares/requireRole.js";
import { getAdminAnalyticsSummary } from "../controllers/adminAnalytics.controller.js";
import { ROLE_GROUPS } from "../utils/rbac.js";

const router = Router();
router.get("/analytics/summary", requireRole(...ROLE_GROUPS.REPORT_READ), asyncHandler(getAdminAnalyticsSummary));
export default router;
