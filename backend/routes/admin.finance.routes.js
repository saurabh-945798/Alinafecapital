import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireRole } from "../middlewares/requireRole.js";
import { adminFinanceController } from "../controllers/adminFinance.controller.js";
import { ROLE_GROUPS } from "../utils/rbac.js";

const router = Router();
router.get("/financial-journal", requireRole(...ROLE_GROUPS.FINANCE_READ), asyncHandler(adminFinanceController.journal));
router.get("/audit-trail", requireRole("SUPER_ADMIN", "AUDITOR"), asyncHandler(adminFinanceController.audit));
export default router;
