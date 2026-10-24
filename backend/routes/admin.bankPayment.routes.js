import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireRole } from "../middlewares/requireRole.js";
import { strictAdminWriteLimiter } from "../middlewares/rateLimiters.js";
import { bankPaymentController } from "../controllers/bankPayment.controller.js";

const router = Router();
router.get(
  "/bank-payments",
  requireRole("SUPER_ADMIN", "PAYMENT_VERIFIER", "AUDITOR"),
  asyncHandler(bankPaymentController.adminList)
);
router.get(
  "/bank-payments/:id",
  requireRole("SUPER_ADMIN", "PAYMENT_VERIFIER", "AUDITOR"),
  asyncHandler(bankPaymentController.adminGet)
);
router.post(
  "/bank-payments/:id/decision",
  requireRole("SUPER_ADMIN", "PAYMENT_VERIFIER"),
  strictAdminWriteLimiter,
  asyncHandler(bankPaymentController.adminDecision)
);
export default router;
