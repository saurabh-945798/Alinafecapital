import { Router } from "express";
import { requireRole } from "../middlewares/requireRole.js";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { adminCustomerController } from "../controllers/adminCustomer.controller.js";
import { ROLE_GROUPS } from "../utils/rbac.js";

const router = Router();
router.get("/customers", requireRole(...ROLE_GROUPS.CUSTOMER_READ), asyncHandler(adminCustomerController.list));
router.get("/customers/:id", requireRole(...ROLE_GROUPS.CUSTOMER_READ), asyncHandler(adminCustomerController.getById));
export default router;
