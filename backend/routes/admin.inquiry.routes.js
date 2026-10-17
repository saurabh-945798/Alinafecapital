import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireRole } from "../middlewares/requireRole.js";
import { loanInquiryController } from "../controllers/loanInquiry.controller.js";
import { upload } from "../config/upload.js";
import { strictAdminWriteLimiter } from "../middlewares/rateLimiters.js";
import { ROLE_GROUPS } from "../utils/rbac.js";

const router = Router();

const handleUploadError = (err, req, res, next) => {
  if (!err) return next();
  if (err?.name === "MulterError" && err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "File too large. KYC docs max is 6MB.", code: "FILE_TOO_LARGE" });
  }
  return res.status(400).json({ success: false, message: err?.message || "Upload failed", code: "UPLOAD_ERROR" });
};

router.get("/inquiries", requireRole(...ROLE_GROUPS.INQUIRY_READ), asyncHandler(loanInquiryController.adminList));
router.get("/inquiries/:id", requireRole(...ROLE_GROUPS.INQUIRY_READ), asyncHandler(loanInquiryController.adminGetById));
router.post(
  "/inquiries/:id/doc",
  strictAdminWriteLimiter,
  requireRole("SUPER_ADMIN", "VERIFIER"),
  upload.single("file"),
  handleUploadError,
  asyncHandler(loanInquiryController.adminUploadDoc)
);
router.delete(
  "/inquiries/:id/doc/:type",
  strictAdminWriteLimiter,
  requireRole("SUPER_ADMIN", "VERIFIER"),
  asyncHandler(loanInquiryController.adminRemoveDoc)
);
router.patch(
  "/inquiries/:id",
  strictAdminWriteLimiter,
  requireRole("SUPER_ADMIN", "LOAN_OPERATIONS", "VERIFIER", "APPROVAL", "AUTHORIZED", "DISBURSED"),
  asyncHandler(loanInquiryController.adminUpdate)
);
router.delete(
  "/inquiries/:id",
  strictAdminWriteLimiter,
  requireRole("SUPER_ADMIN"),
  asyncHandler(loanInquiryController.adminDelete)
);

export default router;
