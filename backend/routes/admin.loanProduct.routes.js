import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireRole } from "../middlewares/requireRole.js";
import { loanProductController } from "../controllers/loanProduct.controller.js";
import { strictAdminWriteLimiter } from "../middlewares/rateLimiters.js";

const router = Router();

// GET /api/v1/admin/loan-products
router.get("/loan-products", requireRole("SUPER_ADMIN"), asyncHandler(loanProductController.adminListAll));

// POST /api/v1/admin/loan-products
router.post("/loan-products", requireRole("SUPER_ADMIN"), strictAdminWriteLimiter, asyncHandler(loanProductController.adminCreate));

// PATCH /api/v1/admin/loan-products/:id
router.patch("/loan-products/:id", requireRole("SUPER_ADMIN"), strictAdminWriteLimiter, asyncHandler(loanProductController.adminUpdate));

// DELETE /api/v1/admin/loan-products/:id  (soft delete -> inactive)
router.delete("/loan-products/:id", requireRole("SUPER_ADMIN"), strictAdminWriteLimiter, asyncHandler(loanProductController.adminDelete));

export default router;
