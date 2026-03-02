import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { emiCalculatorController } from "../controllers/emiCalculator.controller.js";

const router = Router();

router.post("/emi", asyncHandler(emiCalculatorController.calculate));

export default router;