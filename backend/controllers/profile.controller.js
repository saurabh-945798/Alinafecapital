import UserProfile from "../models/UserProfile.js";
import { calculateProfileCompletion } from "../utils/profileCompletion.js";
import fs from "fs";

const ALLOWED_DOC_TYPES = new Set([
  "national_id",
  "bank_statement_3_months",
  "payslip_or_business_proof",
]);

const toPublicFileUrl = (filePath = "") => {
  const normalized = String(filePath).replace(/\\/g, "/");
  const idx = normalized.indexOf("uploads/");
  const relative = idx >= 0 ? normalized.slice(idx) : normalized;
  return `/${relative}`;
};

const toPublicProfile = (profile) => {
  if (!profile) return null;

  const obj = profile.toObject ? profile.toObject() : profile;
  const { avatarPath, ...safeProfile } = obj;
  const safeDocs = (obj.documents || []).map((d) => ({
    type: d.type,
    fileUrl: d.fileUrl,
    mime: d.mime,
    uploadedAt: d.uploadedAt,
  }));

  return {
    ...safeProfile,
    documents: safeDocs,
  };
};

export async function getMyProfile(req, res, next) {
  try {
    const userId = req.user._id;
    const profile = await UserProfile.findOne({ userId });

    if (profile) {
      // Auto-heal stale avatar references so frontend does not keep requesting 404 files.
      if (profile.avatarPath && !fs.existsSync(profile.avatarPath)) {
        profile.avatarPath = "";
        profile.avatarUrl = "";
      }

      const recomputed = calculateProfileCompletion(profile);
      if (profile.profileCompletion !== recomputed) {
        profile.profileCompletion = recomputed;
      }

      if (profile.isModified("avatarPath") || profile.isModified("avatarUrl") || profile.isModified("profileCompletion")) {
        await profile.save({ validateBeforeSave: false });
      }
    }

    return res.json({
      success: true,
      data: toPublicProfile(profile),
    });
  } catch (error) {
    return next(error);
  }
}

export async function upsertMyProfile(req, res, next) {
  try {
    const userId = req.user._id;

    const update = {
      fullName: req.user.fullName,
      email: req.user.email,
      phone: req.user.phone,
      addressLine1: req.body.addressLine1,
      city: req.body.city,
      district: req.body.district,
      country: req.body.country || "Malawi",
      employmentType: req.body.employmentType,
      monthlyIncome:
        req.body.monthlyIncome !== undefined ? Number(req.body.monthlyIncome) : undefined,
      bankName: req.body.bankName,
      accountNumber: req.body.accountNumber,
      branchCode: req.body.branchCode,
    };

    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { $set: update, $setOnInsert: { userId } },
      { upsert: true, returnDocument: "after" }
    );

    profile.profileCompletion = calculateProfileCompletion(profile);

    if (profile.kycStatus === "not_started" && profile.profileCompletion > 0) {
      profile.kycStatus = "not_started";
    }

    await profile.save();

    return res.json({
      success: true,
      data: toPublicProfile(profile),
    });
  } catch (error) {
    return next(error);
  }
}

export async function uploadMyDoc(req, res, next) {
  try {
    const userId = req.user._id;
    const type = String(req.body.type || "").trim();

    if (!ALLOWED_DOC_TYPES.has(type)) {
      return res.status(400).json({
        success: false,
        message:
          "Document type must be national_id, bank_statement_3_months, or payslip_or_business_proof",
        code: "VALIDATION_ERROR",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "File is required",
        code: "VALIDATION_ERROR",
      });
    }

    const profile =
      (await UserProfile.findOne({ userId })) ||
      new UserProfile({
        userId,
        fullName: req.user.fullName,
        email: req.user.email,
        phone: req.user.phone,
      });

    const filePath = req.file.path;
    const fileUrl = toPublicFileUrl(filePath);

    // Replace existing same-type document
    profile.documents = (profile.documents || []).filter((d) => d.type !== type);
    profile.documents.push({
      type,
      fileUrl,
      filePath,
      mime: req.file.mimetype,
      uploadedAt: new Date(),
    });

    profile.profileCompletion = calculateProfileCompletion(profile);
    await profile.save();

    return res.json({
      success: true,
      data: toPublicProfile(profile),
    });
  } catch (error) {
    return next(error);
  }
}

export async function submitKyc(req, res, next) {
  try {
    const userId = req.user._id;
    const profile = await UserProfile.findOne({ userId });

    if (!profile) {
      return res.status(403).json({
        success: false,
        message: "Profile not found. Complete profile first.",
        code: "PROFILE_REQUIRED",
      });
    }

    profile.profileCompletion = calculateProfileCompletion(profile);

    if (profile.profileCompletion !== 100) {
      await profile.save();
      return res.status(400).json({
        success: false,
        message: "Profile must be 100% complete before KYC submission",
        code: "PROFILE_INCOMPLETE",
      });
    }

    profile.kycStatus = "pending";
    profile.submittedAt = new Date();
    profile.verifiedAt = null;
    profile.rejectedAt = null;
    await profile.save();

    return res.json({
      success: true,
      data: toPublicProfile(profile),
    });
  } catch (error) {
    return next(error);
  }
}

export async function uploadMyAvatar(req, res, next) {
  try {
    const userId = req.user._id;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Avatar file is required",
        code: "VALIDATION_ERROR",
      });
    }

    const profile =
      (await UserProfile.findOne({ userId })) ||
      new UserProfile({
        userId,
        fullName: req.user.fullName,
        email: req.user.email,
        phone: req.user.phone,
      });

    const previousAvatarPath = profile.avatarPath || "";
    const filePath = req.file.path;
    const fileUrl = toPublicFileUrl(filePath);

    profile.avatarPath = filePath;
    profile.avatarUrl = fileUrl;
    profile.profileCompletion = calculateProfileCompletion(profile);
    await profile.save();

    if (previousAvatarPath && previousAvatarPath !== filePath && fs.existsSync(previousAvatarPath)) {
      try {
        fs.unlinkSync(previousAvatarPath);
      } catch {
        // ignore cleanup failure
      }
    }

    return res.json({
      success: true,
      data: toPublicProfile(profile),
    });
  } catch (error) {
    return next(error);
  }
}

export async function removeMyAvatar(req, res, next) {
  try {
    const userId = req.user._id;
    const profile = await UserProfile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
        code: "NOT_FOUND",
      });
    }

    const previousAvatarPath = profile.avatarPath || "";
    profile.avatarPath = "";
    profile.avatarUrl = "";
    profile.profileCompletion = calculateProfileCompletion(profile);
    await profile.save();

    if (previousAvatarPath && fs.existsSync(previousAvatarPath)) {
      try {
        fs.unlinkSync(previousAvatarPath);
      } catch {
        // ignore cleanup failure
      }
    }

    return res.json({
      success: true,
      data: toPublicProfile(profile),
    });
  } catch (error) {
    return next(error);
  }
}

