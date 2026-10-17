import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireRole } from "../middlewares/requireRole.js";
import { adminApplicationController } from "../controllers/adminApplication.controller.js";
import { strictAdminWriteLimiter } from "../middlewares/rateLimiters.js";
import { ROLE_GROUPS } from "../utils/rbac.js";

const router = Router();

router.get("/applications", requireRole(...ROLE_GROUPS.APPLICATION_READ), asyncHandler(adminApplicationController.listAll));
router.get("/applications/:id", requireRole(...ROLE_GROUPS.APPLICATION_READ), asyncHandler(adminApplicationController.getById));
router.patch(
  "/applications/:id/status",
  strictAdminWriteLimiter,
  requireRole("SUPER_ADMIN", "LOAN_OPERATIONS", "VERIFIER", "APPROVAL", "AUTHORIZED", "DISBURSED"),
  asyncHandler(adminApplicationController.updateStatus)
);

export default router;
