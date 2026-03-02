import { Router } from "express";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import { listKyc, verifyKyc, rejectKyc } from "../controllers/kyc.controller.js";

const router = Router();

router.get("/kyc", requireAdmin, listKyc);
router.post("/kyc/:userId/verify", requireAdmin, verifyKyc);
router.post("/kyc/:userId/reject", requireAdmin, rejectKyc);

export default router;
