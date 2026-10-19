import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireRole } from "../middlewares/requireRole.js";
import { strictAdminWriteLimiter } from "../middlewares/rateLimiters.js";
import { bankPaymentController } from "../controllers/bankPayment.controller.js";
import { ROLE_GROUPS } from "../utils/rbac.js";

const router = Router();
router.get("/bank-payments", requireRole(...ROLE_GROUPS.PAYMENT_READ), asyncHandler(bankPaymentController.adminList));
router.get("/bank-payments/:id", requireRole(...ROLE_GROUPS.PAYMENT_READ), asyncHandler(bankPaymentController.adminGet));
router.post(
  "/bank-payments/:id/decision",
  requireRole("SUPER_ADMIN", "PAYMENT_VERIFIER"),
  strictAdminWriteLimiter,
  asyncHandler(bankPaymentController.adminDecision)
);
export default router;
