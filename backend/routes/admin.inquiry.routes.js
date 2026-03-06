import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import { loanInquiryController } from "../controllers/loanInquiry.controller.js";

const router = Router();

router.use(requireAdmin);
router.get("/inquiries", asyncHandler(loanInquiryController.adminList));
router.patch("/inquiries/:id", asyncHandler(loanInquiryController.adminUpdate));

export default router;

