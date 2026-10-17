import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { customerLoanAccountController } from "../controllers/customerLoanAccount.controller.js";

const router = Router();

router.get("/mine", requireAuth, asyncHandler(customerLoanAccountController.listMine));
router.get("/mine/:id", requireAuth, asyncHandler(customerLoanAccountController.getMineById));

export default router;
