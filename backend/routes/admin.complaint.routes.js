import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireRole } from "../middlewares/requireRole.js";
import { complaintController } from "../controllers/complaint.controller.js";
import { strictAdminWriteLimiter } from "../middlewares/rateLimiters.js";
import { ROLE_GROUPS } from "../utils/rbac.js";

const router = Router();
router.get("/complaints", requireRole(...ROLE_GROUPS.COMPLAINT_READ), asyncHandler(complaintController.adminList));
router.patch(
  "/complaints/:id",
  requireRole("SUPER_ADMIN", "CUSTOMER_SERVICE"),
  strictAdminWriteLimiter,
  asyncHandler(complaintController.adminUpdate)
);
export default router;
