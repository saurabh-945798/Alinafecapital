import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { loanInquiryController } from "../controllers/loanInquiry.controller.js";

const router = Router();

router.post("/", asyncHandler(loanInquiryController.createPublic));

export default router;

