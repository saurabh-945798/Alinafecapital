import { Router } from "express";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import { listKyc, verifyKyc, rejectKyc } from "../controllers/kyc.controller.js";

const r = Router();

r.get("/kyc", requireAdmin, listKyc);
r.post("/kyc/:userId/verify", requireAdmin, verifyKyc);
r.post("/kyc/:userId/reject", requireAdmin, rejectKyc);

export default r;
