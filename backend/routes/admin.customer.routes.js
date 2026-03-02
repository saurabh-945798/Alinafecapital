import { Router } from "express";
import { adminKeyAuth } from "../middlewares/adminKeyAuth.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { adminCustomerController } from "../controllers/adminCustomer.controller.js";

const router = Router();

router.use(adminKeyAuth);
router.get("/customers", asyncHandler(adminCustomerController.list));
router.get("/customers/:id", asyncHandler(adminCustomerController.getById));

export default router;

