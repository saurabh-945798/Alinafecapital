import { Router } from "express";
import { adminKeyAuth } from "../middlewares/adminKeyAuth.js";
import { listKyc, verifyKyc, rejectKyc } from "../controllers/kyc.controller.js";

const router = Router();

router.get("/kyc", adminKeyAuth, listKyc);
router.post("/kyc/:userId/verify", adminKeyAuth, verifyKyc);
router.post("/kyc/:userId/reject", adminKeyAuth, rejectKyc);

export default router;
