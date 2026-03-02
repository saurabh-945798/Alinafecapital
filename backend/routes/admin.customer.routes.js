import { Router } from "express";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { adminCustomerController } from "../controllers/adminCustomer.controller.js";

const router = Router();

router.use(requireAdmin);
router.get("/customers", asyncHandler(adminCustomerController.list));
router.get("/customers/:id", asyncHandler(adminCustomerController.getById));

export default router;
