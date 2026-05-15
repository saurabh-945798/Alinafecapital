import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireRole } from "../middlewares/requireRole.js";
import { loanAccountController } from "../controllers/loanAccount.controller.js";
import { strictAdminWriteLimiter } from "../middlewares/rateLimiters.js";

const router = Router();

router.get("/accounts", requireRole("SUPER_ADMIN", "DISBURSED"), asyncHandler(loanAccountController.adminList));
router.get("/accounts/:id", requireRole("SUPER_ADMIN", "DISBURSED"), asyncHandler(loanAccountController.adminGetById));
router.post(
  "/accounts/:id/payments",
  requireRole("SUPER_ADMIN", "DISBURSED"),
  strictAdminWriteLimiter,
  asyncHandler(loanAccountController.adminAddPayment)
);
router.patch(
  "/accounts/:id/payments/:paymentId",
  requireRole("SUPER_ADMIN", "DISBURSED"),
  strictAdminWriteLimiter,
  asyncHandler(loanAccountController.adminUpdatePayment)
);
router.delete(
  "/accounts/:id/payments/:paymentId",
  requireRole("SUPER_ADMIN", "DISBURSED"),
  strictAdminWriteLimiter,
  asyncHandler(loanAccountController.adminDeletePayment)
);

export default router;
