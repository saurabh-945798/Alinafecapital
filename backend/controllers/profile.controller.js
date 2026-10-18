import UserProfile from "../models/UserProfile.js";
import { calculateProfileCompletion } from "../utils/profileCompletion.js";
import fs from "fs";
import { toPersistedUploadPath, toPublicUploadUrl } from "../utils/uploadPaths.js";
import { syncLatestInquiryToCustomerProfile } from "../services/customerAccountLink.service.js";

const getProfileCompletion = (profile) => {
  const kycStatus = String(profile?.kycStatus || "not_started").toLowerCase();
  const updateStatus = String(profile?.kycUpdateStatus || "none").toLowerCase();
  const activeUpdate = ["draft", "pending_review"].includes(updateStatus);

  // A verified profile must not fall back to 0% simply because an older/legacy
  // source record is missing fields. Explicit KYC update flows may recalculate.
  if (kycStatus === "verified" && !activeUpdate) return 100;
  return calculateProfileCompletion(profile || {});
};

const ALLOWED_DOC_TYPES = new Set([
  "national_id",
  "bank_statement_3_months",
  "security_offer",
  "guarantor_national_id",
  "payslip_or_business_proof",
]);

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
    await syncLatestInquiryToCustomerProfile(req.user);
    const profile = await UserProfile.findOne({ userId });

    if (profile) {
      const recomputed = getProfileCompletion(profile);
      if (profile.profileCompletion !== recomputed) {
        profile.profileCompletion = recomputed;
      }

      if (profile.isModified("profileCompletion")) {
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
      businessName: req.body.businessName,
      employerNameOrBusinessAddress: req.body.employerNameOrBusinessAddress,
      businessActivityNature: req.body.businessActivityNature,
      jobTitle: req.body.jobTitle,
      employmentNumber: req.body.employmentNumber,
      employmentStatus: req.body.employmentStatus,
      contractDurationYears:
        req.body.contractDurationYears !== undefined
          ? Number(req.body.contractDurationYears)
          : undefined,
      contractDurationMonths:
        req.body.contractDurationMonths !== undefined
          ? Number(req.body.contractDurationMonths)
          : undefined,
      durationWorkedYears:
        req.body.durationWorkedYears !== undefined
          ? Number(req.body.durationWorkedYears)
          : undefined,
      durationWorkedMonths:
        req.body.durationWorkedMonths !== undefined
          ? Number(req.body.durationWorkedMonths)
          : undefined,
      hrContactPhone: req.body.hrContactPhone,
      governmentId: req.body.governmentId,
      salaryDate: req.body.salaryDate,
      monthlyIncome:
        req.body.monthlyIncome !== undefined ? Number(req.body.monthlyIncome) : undefined,
      bankName: req.body.bankName,
      accountNumber: req.body.accountNumber,
      branchCode: req.body.branchCode,
      reference1Name: req.body.reference1Name,
      reference1Phone: req.body.reference1Phone,
      reference2Name: req.body.reference2Name,
      reference2Phone: req.body.reference2Phone,
      guarantorRelationship: req.body.guarantorRelationship,
      guarantorOccupation: req.body.guarantorOccupation,
      guarantorHomeVillage: req.body.guarantorHomeVillage,
    };

    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { $set: update, $setOnInsert: { userId } },
      { upsert: true, returnDocument: "after" }
    );

    profile.profileCompletion = getProfileCompletion(profile);

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
          "Document type must be national_id, bank_statement_3_months, security_offer, or payslip_or_business_proof",
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

    const filePath = toPersistedUploadPath(req.file.path, "profile-doc");
    const fileUrl = toPublicUploadUrl(filePath);

    // Replace existing same-type document
    profile.documents = (profile.documents || []).filter((d) => d.type !== type);
    profile.documents.push({
      type,
      fileUrl,
      filePath,
      mime: req.file.mimetype,
      uploadedAt: new Date(),
    });

    profile.profileCompletion = getProfileCompletion(profile);
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

    profile.profileCompletion = getProfileCompletion(profile);

    if (!String(profile.avatarUrl || "").trim()) {
      await profile.save();
      return res.status(400).json({
        success: false,
        message: "Profile photo is required before KYC submission",
        code: "AVATAR_REQUIRED",
      });
    }

    const hasGuarantorDetails =
      String(profile.reference1Name || "").trim() &&
      String(profile.reference1Phone || "").trim() &&
      String(profile.guarantorRelationship || "").trim() &&
      Array.isArray(profile.documents) &&
      profile.documents.some((d) => d?.type === "guarantor_national_id") &&
      String(profile.guarantorOccupation || "").trim() &&
      String(profile.guarantorHomeVillage || "").trim();

    if (!hasGuarantorDetails) {
      await profile.save();
      return res.status(400).json({
        success: false,
        message: "Please complete all guarantor details before KYC submission",
        code: "GUARANTOR_INCOMPLETE",
      });
    }

    if (profile.profileCompletion !== 100) {
      await profile.save();
      return res.status(400).json({
        success: false,
        message: "Profile must be 100% complete before KYC submission",
        code: "PROFILE_INCOMPLETE",
      });
    }

    profile.kycStatus = "pending";
    if (["draft", "rejected"].includes(String(profile.kycUpdateStatus || "").toLowerCase())) {
      profile.kycUpdateStatus = "pending_review";
    }
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


export async function requestKycUpdate(req, res, next) {
  try {
    const userId = req.user._id;
    const profile = await UserProfile.findOne({ userId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Profile not found. Complete your profile first.",
        code: "PROFILE_NOT_FOUND",
      });
    }

    if (String(profile.kycStatus || "").toLowerCase() !== "verified") {
      return res.status(400).json({
        success: false,
        message: "KYC update requests are available after your KYC has been verified.",
        code: "KYC_NOT_VERIFIED",
      });
    }

    const reason = String(req.body?.reason || "")
      .trim()
      .slice(0, 500);

    profile.kycStatus = "not_started";
    profile.kycUpdateStatus = "draft";
    profile.kycUpdateReason = reason;
    profile.kycUpdateRequestedAt = new Date();
    profile.kycRemarks = reason
      ? `Customer requested KYC update: ${reason}`
      : "Customer requested KYC update.";
    profile.profileCompletion = getProfileCompletion(profile);

    await profile.save({ validateBeforeSave: false });

    return res.json({
      success: true,
      message: "KYC update request started. Update the details or documents that have changed, then submit for admin review.",
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
    const filePath = toPersistedUploadPath(req.file.path, "profile-avatar");
    const fileUrl = toPublicUploadUrl(filePath);

    profile.avatarPath = filePath;
    profile.avatarUrl = fileUrl;
    profile.profileCompletion = getProfileCompletion(profile);
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
    profile.profileCompletion = getProfileCompletion(profile);
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



export async function getMyRepaymentReminders(req, res, next) {
  try {
    const profile = await UserProfile.findOne({ userId: req.user._id }).lean();
    return res.json({
      success: true,
      data: profile?.repaymentReminders || { dashboard: true, sms: true, email: false },
    });
  } catch (error) {
    return next(error);
  }
}

export async function updateMyRepaymentReminders(req, res, next) {
  try {
    const clean = {};
    for (const key of ["dashboard", "sms", "email"]) {
      if (typeof req.body?.[key] === "boolean") clean[`repaymentReminders.${key}`] = req.body[key];
    }
    const profile = await UserProfile.findOneAndUpdate(
      { userId: req.user._id },
      { $set: clean, $setOnInsert: { userId: req.user._id, fullName: req.user.fullName, email: req.user.email, phone: req.user.phone } },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    ).lean();
    return res.json({
      success: true,
      message: "Reminder preferences saved.",
      data: profile?.repaymentReminders || { dashboard: true, sms: true, email: false },
    });
  } catch (error) {
    return next(error);
  }
}
