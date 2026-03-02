import { Router } from "express";
import { adminKeyAuth } from "../middlewares/adminKeyAuth.js"; // your existing
import { listKyc, verifyKyc, rejectKyc } from "../controllers/kyc.controller.js";

const r = Router();

r.get("/kyc", adminKeyAuth, listKyc);
r.post("/kyc/:userId/verify", adminKeyAuth, verifyKyc);
r.post("/kyc/:userId/reject", adminKeyAuth, rejectKyc);

export default r;