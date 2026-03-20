import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { upload, uploadAvatar } from "../config/upload.js";
import { requireInquiryAccess } from "../middlewares/requireInquiryAccess.js";
import { loanInquiryController } from "../controllers/loanInquiry.controller.js";

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

router.post("/", asyncHandler(loanInquiryController.createPublic));
router.get("/access/:token/profile", requireInquiryAccess, asyncHandler(loanInquiryController.publicProfile));
router.put("/access/:token/profile", requireInquiryAccess, asyncHandler(loanInquiryController.publicProfileUpdate));
router.post(
  "/access/:token/avatar",
  requireInquiryAccess,
  uploadAvatar.single("file"),
  handleUploadError,
  asyncHandler(loanInquiryController.publicAvatarUpload)
);
router.post(
  "/access/:token/doc",
  requireInquiryAccess,
  upload.single("file"),
  handleUploadError,
  asyncHandler(loanInquiryController.publicDocUpload)
);
router.post("/access/:token/submit", requireInquiryAccess, asyncHandler(loanInquiryController.publicSubmitKyc));

export default router;
