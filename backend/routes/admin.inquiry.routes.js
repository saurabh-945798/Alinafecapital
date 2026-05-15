import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAdmin } from "../middlewares/requireAdmin.js";
import { requireRole } from "../middlewares/requireRole.js";
import { loanInquiryController } from "../controllers/loanInquiry.controller.js";
import { upload } from "../config/upload.js";
import { strictAdminWriteLimiter } from "../middlewares/rateLimiters.js";

const router = Router();

const handleUploadError = (err, req, res, next) => {
  if (!err) return next();

  if (err?.name === "MulterError" && err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({
      success: false,
      message: "File too large. KYC docs max is 6MB.",
      code: "FILE_TOO_LARGE",
    });
  }

  return res.status(400).json({
    success: false,
    message: err?.message || "Upload failed",
    code: "UPLOAD_ERROR",
  });
};

router.use(requireAdmin);
router.get("/inquiries", asyncHandler(loanInquiryController.adminList));
router.get("/inquiries/:id", asyncHandler(loanInquiryController.adminGetById));
router.post(
  "/inquiries/:id/doc",
  strictAdminWriteLimiter,
  requireRole("SUPER_ADMIN", "VERIFIER", "APPROVAL", "AUTHORIZED", "DISBURSED"),
  upload.single("file"),
  handleUploadError,
  asyncHandler(loanInquiryController.adminUploadDoc)
);
router.delete(
  "/inquiries/:id/doc/:type",
  strictAdminWriteLimiter,
  requireRole("SUPER_ADMIN", "VERIFIER", "APPROVAL", "AUTHORIZED", "DISBURSED"),
  asyncHandler(loanInquiryController.adminRemoveDoc)
);
router.patch(
  "/inquiries/:id",
  strictAdminWriteLimiter,
  requireRole("SUPER_ADMIN", "VERIFIER", "APPROVAL", "AUTHORIZED", "DISBURSED"),
  asyncHandler(loanInquiryController.adminUpdate)
);
router.delete(
  "/inquiries/:id",
  strictAdminWriteLimiter,
  requireRole("SUPER_ADMIN"),
  asyncHandler(loanInquiryController.adminDelete)
);

export default router;
