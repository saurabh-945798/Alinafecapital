import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { complaintController } from "../controllers/complaint.controller.js";

const router = Router();

router.post("/", asyncHandler(complaintController.createPublic));

export default router;
