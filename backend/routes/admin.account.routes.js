import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireRole } from "../middlewares/requireRole.js";
import { loanAccountController } from "../controllers/loanAccount.controller.js";
import { strictAdminWriteLimiter } from "../middlewares/rateLimiters.js";
import { ROLE_GROUPS } from "../utils/rbac.js";

const router = Router();
router.get("/accounts", requireRole(...ROLE_GROUPS.ACCOUNT_READ), asyncHandler(loanAccountController.adminList));
router.get("/accounts/:id", requireRole(...ROLE_GROUPS.ACCOUNT_READ), asyncHandler(loanAccountController.adminGetById));
router.post(
  "/accounts/:id/payments",
  requireRole("SUPER_ADMIN", "FINANCE_RECON"),
  strictAdminWriteLimiter,
  asyncHandler(loanAccountController.adminAddPayment)
);
router.patch(
  "/accounts/:id/payments/:paymentId",
  requireRole("SUPER_ADMIN", "FINANCE_RECON"),
  strictAdminWriteLimiter,
  asyncHandler(loanAccountController.adminUpdatePayment)
);
router.delete(
  "/accounts/:id/payments/:paymentId",
  requireRole("SUPER_ADMIN", "FINANCE_RECON"),
  strictAdminWriteLimiter,
  asyncHandler(loanAccountController.adminDeletePayment)
);
export default router;
