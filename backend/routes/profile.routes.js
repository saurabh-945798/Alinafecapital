import { Router } from "express";
import { requireAuth } from "../middlewares/requireAuth.js";
import { upload, uploadAvatar } from "../config/upload.js";
import {
  getMyProfile,
  upsertMyProfile,
  uploadMyDoc,
  submitKyc,
  uploadMyAvatar,
} from "../controllers/profile.controller.js";

const router = Router();

router.get("/me", requireAuth, getMyProfile);
router.put("/me", requireAuth, upsertMyProfile);
router.post("/me/avatar", requireAuth, uploadAvatar.single("file"), uploadMyAvatar);
router.post("/me/doc", requireAuth, upload.single("file"), uploadMyDoc);
router.post("/me/submit", requireAuth, submitKyc);

export default router;
