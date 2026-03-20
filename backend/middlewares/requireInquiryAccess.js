import { LoanInquiry } from "../models/LoanInquiry.model.js";

export async function requireInquiryAccess(req, res, next) {
  try {
    const token = String(req.params.token || "").trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Invalid inquiry access token",
        code: "VALIDATION_ERROR",
      });
    }

    const inquiry = await LoanInquiry.findOne({ publicAccessToken: token });
    if (!inquiry) {
      return res.status(404).json({
        success: false,
        message: "Inquiry link is invalid or expired",
        code: "NOT_FOUND",
      });
    }

    req.inquiry = inquiry;
    req.uploadOwnerId = String(inquiry._id);
    next();
  } catch (error) {
    next(error);
  }
}
