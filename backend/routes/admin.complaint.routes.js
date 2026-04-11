import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import { complaintController } from "../controllers/complaint.controller.js";

const router = Router();

router.use(requireAdmin);
router.get("/complaints", asyncHandler(complaintController.adminList));
router.patch("/complaints/:id", asyncHandler(complaintController.adminUpdate));

export default router;
