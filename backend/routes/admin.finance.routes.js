import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireRole } from "../middlewares/requireRole.js";
import { adminFinanceController } from "../controllers/adminFinance.controller.js";

const router = Router();

router.get(
  "/financial-journal",
  requireRole("SUPER_ADMIN", "PAYMENT_VERIFIER", "AUDITOR"),
  asyncHandler(adminFinanceController.journal)
);
router.get(
  "/audit-trail",
  requireRole("SUPER_ADMIN", "AUDITOR"),
  asyncHandler(adminFinanceController.audit)
);

export default router;
