import { Router } from "express";
import { asyncHandler } from "../middlewares/asyncHandler.js";
import { requireAuth } from "../middlewares/requireAuth.js";
import { uploadPayment } from "../config/upload.js";
import { bankPaymentController } from "../controllers/bankPayment.controller.js";
import { strictAdminWriteLimiter } from "../middlewares/rateLimiters.js";

const router = Router();

const setUploadOwner = (req, res, next) => {
  req.uploadOwnerId = req.user?._id || "payment";
  next();
};

const handleUploadError = (err, req, res, next) => {
  if (!err) return next();
  if (err?.code === "LIMIT_FILE_SIZE") {
    return res.status(400).json({ success: false, message: "Proof of Payment is too large. Maximum size is 6MB.", code: "FILE_TOO_LARGE" });
  }
  return res.status(400).json({ success: false, message: err?.message || "Proof of Payment upload failed", code: err?.code || "UPLOAD_ERROR" });
};

router.get("/bank/details", requireAuth, asyncHandler(bankPaymentController.details));
router.get("/bank/mine", requireAuth, asyncHandler(bankPaymentController.listMine));
router.post(
  "/bank",
  requireAuth,
  strictAdminWriteLimiter,
  setUploadOwner,
  uploadPayment.single("pop"),
  handleUploadError,
  asyncHandler(bankPaymentController.submit)
);
router.post(
  "/bank/:id/respond",
  requireAuth,
  strictAdminWriteLimiter,
  setUploadOwner,
  uploadPayment.single("pop"),
  handleUploadError,
  asyncHandler(bankPaymentController.respondToClarification)
);

export default router;
