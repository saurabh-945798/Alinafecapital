import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import { requireRole } from "../middlewares/requireRole.js";
import { adminApplicationController } from "../controllers/adminApplication.controller.js";
import { strictAdminWriteLimiter } from "../middlewares/rateLimiters.js";

const router = Router();

router.use(requireAdmin);

// GET all
router.get("/applications", asyncHandler(adminApplicationController.listAll));

// GET one
router.get("/applications/:id", asyncHandler(adminApplicationController.getById));

// PATCH status
router.patch(
  "/applications/:id/status",
  strictAdminWriteLimiter,
  requireRole("SUPER_ADMIN", "VERIFIER", "APPROVAL", "AUTHORIZED", "DISBURSED"),
  asyncHandler(adminApplicationController.updateStatus)
);

export default router;
