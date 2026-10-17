import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { mastercardRepaymentController } from "../controllers/mastercardRepayment.controller.js";
import { rejectCardholderData } from "../middlewares/rejectCardData.middleware.js";

const router = Router();

router.use(rejectCardholderData);

router.post("/mastercard/repayments/session", requireAuth, asyncHandler(mastercardRepaymentController.createSession));
router.get("/mastercard/repayments/:paymentId", requireAuth, asyncHandler(mastercardRepaymentController.getPayment));
router.post("/mastercard/repayments/:paymentId/refresh-session", requireAuth, asyncHandler(mastercardRepaymentController.refreshSession));
router.post("/mastercard/repayments/:paymentId/pay", requireAuth, asyncHandler(mastercardRepaymentController.processPayment));
router.post("/mastercard/repayments/:paymentId/status", requireAuth, asyncHandler(mastercardRepaymentController.refreshOrderStatus));

export default router;
