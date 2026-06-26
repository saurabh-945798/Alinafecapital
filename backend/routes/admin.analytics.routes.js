import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireRole } from "../middlewares/requireRole.js";
import { getAdminAnalyticsSummary } from "../controllers/adminAnalytics.controller.js";

const router = Router();

router.get(
  "/analytics/summary",
  requireRole("SUPER_ADMIN"),
  asyncHandler(getAdminAnalyticsSummary)
);

export default router;
