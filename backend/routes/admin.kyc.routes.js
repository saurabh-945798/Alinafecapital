import { Router } from "express";
import { requireRole } from "../middlewares/requireRole.js";
import { listKyc, verifyKyc, rejectKyc } from "../controllers/kyc.controller.js";
import { strictAdminWriteLimiter } from "../middlewares/rateLimiters.js";

const router = Router();

router.get("/kyc", requireRole("SUPER_ADMIN", "VERIFIER"), listKyc);
router.post("/kyc/:userId/verify", requireRole("SUPER_ADMIN", "VERIFIER"), strictAdminWriteLimiter, verifyKyc);
router.post("/kyc/:userId/reject", requireRole("SUPER_ADMIN", "VERIFIER"), strictAdminWriteLimiter, rejectKyc);

export default router;
