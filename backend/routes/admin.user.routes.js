import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireRole } from "../middlewares/requireRole.js";
import { adminUserController } from "../controllers/adminUser.controller.js";
import { strictAdminWriteLimiter } from "../middlewares/rateLimiters.js";

const router = Router();

router.get("/users", requireRole("SUPER_ADMIN"), asyncHandler(adminUserController.list));
router.post("/users", requireRole("SUPER_ADMIN"), strictAdminWriteLimiter, asyncHandler(adminUserController.create));
router.patch("/users/:id", requireRole("SUPER_ADMIN"), strictAdminWriteLimiter, asyncHandler(adminUserController.update));
router.post(
  "/users/:id/reset-password",
  requireRole("SUPER_ADMIN"),
  strictAdminWriteLimiter,
  asyncHandler(adminUserController.resetPassword)
);
router.delete("/users/:id", requireRole("SUPER_ADMIN"), strictAdminWriteLimiter, asyncHandler(adminUserController.remove));

export default router;
