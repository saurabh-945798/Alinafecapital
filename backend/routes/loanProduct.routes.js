import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { loanProductController } from "../controllers/loanProduct.controller.js";

const router = Router();

// GET /api/v1/loan-products?featured=true&amount=50000
router.get("/", asyncHandler(loanProductController.listPublic));

// GET /api/v1/loan-products/:slug
router.get("/:slug", asyncHandler(loanProductController.getBySlugPublic));

export default router;