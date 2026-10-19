import { Router } from "express";
import { serveProtectedKycFile, serveProtectedPaymentPop } from "../controllers/protectedFile.controller.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";

const router = Router();
router.get("/kyc/:owner/:filename", asyncHandler(serveProtectedKycFile));
router.get("/payments/:paymentId/pop", asyncHandler(serveProtectedPaymentPop));
export default router;
