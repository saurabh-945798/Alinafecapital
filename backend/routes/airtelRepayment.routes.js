import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { airtelRepaymentController } from "../controllers/airtelRepayment.controller.js";

const router = Router();

// Public callback endpoint for Airtel to confirm payment outcomes.
router.post("/airtel/repayments/callback", asyncHandler(airtelRepaymentController.callback));

router.post("/airtel/repayments/collection", requireAuth, asyncHandler(airtelRepaymentController.createCollection));
router.get("/airtel/repayments/:paymentId", requireAuth, asyncHandler(airtelRepaymentController.getPayment));
router.post("/airtel/repayments/:paymentId/status", requireAuth, asyncHandler(airtelRepaymentController.refreshStatus));

export default router;
