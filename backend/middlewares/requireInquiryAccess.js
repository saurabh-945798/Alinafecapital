import { LoanInquiry } from "../models/LoanInquiry.model.js";

export async function requireInquiryAccess(req, res, next) {
  try {
    const rawToken = String(req.params.token || "").trim();
    const decodedToken = (() => {
      try {
        return decodeURIComponent(rawToken);
      } catch {
        return rawToken;
      }
    })();
    const token = String(decodedToken || "").trim();
    const cleanedToken = token
      .replace(/^["'`]+|["'`]+$/g, "")
      .replace(/[)\].,;!?]+$/g, "");

    if (!cleanedToken) {
      return res.status(400).json({
        success: false,
        message: "Invalid inquiry access token",
        code: "VALIDATION_ERROR",
      });
    }

    const candidates = Array.from(
      new Set([
        cleanedToken,
        cleanedToken.toLowerCase(),
        cleanedToken.replace(/[^a-zA-Z0-9_-]/g, ""),
      ].filter(Boolean))
    );

    const inquiry = await LoanInquiry.findOne({
      publicAccessToken: { $in: candidates },
    });
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
