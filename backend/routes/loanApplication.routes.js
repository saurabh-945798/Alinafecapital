import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { requireKycVerified } from "../middlewares/requireKycVerified.js";
import { loanApplicationController } from "../controllers/loanApplication.controller.js";

const router = Router();

// GET /api/v1/applications
router.get("/", requireAuth, asyncHandler(loanApplicationController.listMine));

// POST /api/v1/applications
router.post("/", requireAuth, requireKycVerified, asyncHandler(loanApplicationController.create));

// GET /api/v1/applications/:id
router.get("/:id", requireAuth, asyncHandler(loanApplicationController.getById));

export default router;
