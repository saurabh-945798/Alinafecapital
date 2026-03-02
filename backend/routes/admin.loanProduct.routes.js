import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { adminKeyAuth } from "../middlewares/adminKeyAuth.js";
import { loanProductController } from "../controllers/loanProduct.controller.js";

const router = Router();

router.use(adminKeyAuth);

// GET /api/v1/admin/loan-products
router.get("/loan-products", asyncHandler(loanProductController.adminListAll));

// POST /api/v1/admin/loan-products
router.post("/loan-products", asyncHandler(loanProductController.adminCreate));

// PATCH /api/v1/admin/loan-products/:id
router.patch("/loan-products/:id", asyncHandler(loanProductController.adminUpdate));

// DELETE /api/v1/admin/loan-products/:id  (soft delete -> inactive)
router.delete("/loan-products/:id", asyncHandler(loanProductController.adminDelete));

export default router;