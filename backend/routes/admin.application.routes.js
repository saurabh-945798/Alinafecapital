import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { adminKeyAuth } from "../middlewares/adminKeyAuth.js";
import { adminApplicationController } from "../controllers/adminApplication.controller.js";

const router = Router();

router.use(adminKeyAuth);

// GET all
router.get("/applications", asyncHandler(adminApplicationController.listAll));

// GET one
router.get("/applications/:id", asyncHandler(adminApplicationController.getById));

// PATCH status
router.patch("/applications/:id/status", asyncHandler(adminApplicationController.updateStatus));

export default router;