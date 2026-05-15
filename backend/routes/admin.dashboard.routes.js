import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import { getAdminDashboardSummary, getAdminWhoAmI } from "../controllers/adminDashboard.controller.js";

const router = Router();

router.use(requireAdmin);
router.get("/dashboard/summary", asyncHandler(getAdminDashboardSummary));
router.get("/whoami", asyncHandler(getAdminWhoAmI));

export default router;
