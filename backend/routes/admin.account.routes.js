import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import { loanAccountController } from "../controllers/loanAccount.controller.js";

const router = Router();

router.use(requireAdmin);
router.get("/accounts", asyncHandler(loanAccountController.adminList));
router.get("/accounts/:id", asyncHandler(loanAccountController.adminGetById));

export default router;
