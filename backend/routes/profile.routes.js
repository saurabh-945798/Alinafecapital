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
const handleUploadError = (err, req, res, next) => {
  if (!err) return next();

  if (err?.name === "MulterError" && err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large. Avatar max is 5MB, KYC docs max is 6MB.",
      code: "FILE_TOO_LARGE",
    });
  }

  return res.status(400).json({
    success: false,
    message: err?.message || "Upload failed",
    code: "UPLOAD_ERROR",
  });
};

router.get("/me", requireAuth, getMyProfile);
router.put("/me", requireAuth, upsertMyProfile);
router.post("/me/avatar", requireAuth, uploadAvatar.single("file"), handleUploadError, uploadMyAvatar);
router.post("/me/doc", requireAuth, upload.single("file"), handleUploadError, uploadMyDoc);
router.post("/me/submit", requireAuth, submitKyc);

export default router;
