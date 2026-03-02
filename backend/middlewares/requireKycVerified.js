import UserProfile from "../models/UserProfile.js";

export async function requireKycVerified(req, res, next) {
  try {
    const userId = req.user?._id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
        code: "AUTH_ERROR",
      });
    }

    const profile = await UserProfile.findOne({ userId }).lean();
    if (!profile) {
      return res.status(403).json({
        success: false,
        message: "KYC profile not found",
        code: "KYC_REQUIRED",
      });
    }

    if (profile.kycStatus !== "verified") {
      return res.status(403).json({
        success: false,
        message: "KYC must be verified before loan application",
        code: "KYC_NOT_VERIFIED",
      });
    }

    return next();
  } catch (error) {
    return next(error);
  }
}
