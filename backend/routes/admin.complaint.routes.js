import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireRole } from "../middlewares/requireRole.js";
import { complaintController } from "../controllers/complaint.controller.js";
import { strictAdminWriteLimiter } from "../middlewares/rateLimiters.js";

const router = Router();

router.get("/complaints", requireRole("SUPER_ADMIN", "VERIFIER"), asyncHandler(complaintController.adminList));
router.patch(
  "/complaints/:id",
  requireRole("SUPER_ADMIN", "VERIFIER"),
  strictAdminWriteLimiter,
  asyncHandler(complaintController.adminUpdate)
);

export default router;
