import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import { loanAccountController } from "../controllers/loanAccount.controller.js";

const router = Router();

router.use(requireAdmin);
router.get("/accounts", asyncHandler(loanAccountController.adminList));
router.get("/accounts/:id", asyncHandler(loanAccountController.adminGetById));
router.post("/accounts/:id/payments", asyncHandler(loanAccountController.adminAddPayment));
router.patch("/accounts/:id/payments/:paymentId", asyncHandler(loanAccountController.adminUpdatePayment));
router.delete("/accounts/:id/payments/:paymentId", asyncHandler(loanAccountController.adminDeletePayment));

export default router;
