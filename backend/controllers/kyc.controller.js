import UserProfile from "../models/UserProfile.js";
import { LoanInquiry } from "../models/LoanInquiry.model.js";
import fs from "fs";

const safeRegex = (value = "") => {
  const safe = String(value || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return { $regex: safe, $options: "i" };
};

const toPublicDocuments = (documents = []) =>
  (documents || []).filter((d) => d?.filePath && fs.existsSync(String(d.filePath))).map((d) => ({
    type: d.type,
    fileUrl: d.fileUrl,
    mime: d.mime,
    uploadedAt: d.uploadedAt,
  }));

const mapUserProfileRecord = (profile) => {
  const obj = profile.toObject ? profile.toObject() : profile;
  return {
    reviewId: `profile:${String(obj.userId)}`,
    recordType: "user_profile",
    userId: String(obj.userId),
    fullName: obj.fullName || "",
    email: obj.email || "",
    phone: obj.phone || "",
    addressLine1: obj.addressLine1 || "",
    city: obj.city || "",
    district: obj.district || "",
    country: obj.country || "Malawi",
    employmentType: obj.employmentType || "",
    monthlyIncome: obj.monthlyIncome,
    bankName: obj.bankName || "",
    accountNumber: obj.accountNumber || "",
    branchCode: obj.branchCode || "",
    avatarUrl: obj.avatarPath && fs.existsSync(String(obj.avatarPath)) ? obj.avatarUrl || "" : "",
    documents: toPublicDocuments(obj.documents),
    profileCompletion: obj.profileCompletion ?? 0,
    kycStatus: obj.kycStatus || "not_started",
    kycRemarks: obj.kycRemarks || "",
    submittedAt: obj.submittedAt || null,
    verifiedAt: obj.verifiedAt || null,
    rejectedAt: obj.rejectedAt || null,
    updatedAt: obj.updatedAt || obj.createdAt || null,
    createdAt: obj.createdAt || null,
    source: "dashboard",
  };
};

const mapInquiryRecord = (inquiry) => {
  const obj = inquiry.toObject ? inquiry.toObject() : inquiry;
  return {
    reviewId: `inquiry:${String(obj._id)}`,
    recordType: "loan_inquiry",
    userId: String(obj._id),
    fullName: obj.fullName || "",
    email: obj.email || "",
    phone: obj.phone || "",
    addressLine1: obj.addressLine1 || obj.address || "",
    city: obj.city || "",
    district: obj.district || "",
    country: obj.country || "Malawi",
    employmentType: obj.employmentType || "",
    monthlyIncome: obj.monthlyIncome,
    bankName: obj.bankName || "",
    accountNumber: obj.accountNumber || "",
    branchCode: obj.branchCode || "",
    avatarUrl: obj.avatarPath && fs.existsSync(String(obj.avatarPath)) ? obj.avatarUrl || "" : "",
    documents: toPublicDocuments(obj.documents),
    profileCompletion: obj.profileCompletion ?? 0,
    kycStatus: obj.kycStatus || "not_started",
    kycRemarks: obj.kycRemarks || "",
    submittedAt: obj.submittedAt || null,
    verifiedAt: obj.verifiedAt || null,
    rejectedAt: obj.rejectedAt || null,
    updatedAt: obj.updatedAt || obj.createdAt || null,
    createdAt: obj.createdAt || null,
    source: "loan_inquiry",
    loanProductName: obj.loanProductName || "",
    inquiryStatus: obj.status || "",
    closeReason: obj.closeReason || "",
    actionHistory: Array.isArray(obj.actionHistory) ? obj.actionHistory : [],
    contactedAt: obj.contactedAt || null,
    kycSentAt: obj.kycSentAt || null,
    approvedAt: obj.approvedAt || null,
    closedAt: obj.closedAt || null,
  };
};

const parseReviewId = (reviewId = "") => {
  const [recordType, recordKey] = String(reviewId || "").split(":");
  return { recordType, recordKey };
};

const buildProfileFilter = (status, q) => {
  const filter = {};
  if (status && status !== "all") filter.kycStatus = status;
  if (q) {
    const rx = safeRegex(q);
    filter.$or = [{ fullName: rx }, { email: rx }, { phone: rx }, { district: rx }];
  }
  return filter;
};

const buildInquiryFilter = (status, q) => {
  const filter = {};
  if (status && status !== "all") filter.kycStatus = status;
  if (q) {
    const rx = safeRegex(q);
    filter.$or = [{ fullName: rx }, { email: rx }, { phone: rx }, { district: rx }];
  }
  return filter;
};

async function findReviewRecord(reviewId) {
  const { recordType, recordKey } = parseReviewId(reviewId);
  if (!recordType || !recordKey) return null;

  if (recordType === "profile") {
    return {
      recordType,
      doc: await UserProfile.findOne({ userId: recordKey }),
    };
  }

  if (recordType === "inquiry") {
    return {
      recordType,
      doc: await LoanInquiry.findById(recordKey),
    };
  }

  return null;
}

export async function listKyc(req, res, next) {
  try {
    res.set("Cache-Control", "no-store");

    const status = req.query.status ? String(req.query.status).trim() : "pending";
    const q = String(req.query.q || "").trim();
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [profiles, inquiries] = await Promise.all([
      UserProfile.find(buildProfileFilter(status, q)).sort({ updatedAt: -1 }),
      LoanInquiry.find(buildInquiryFilter(status, q)).sort({ updatedAt: -1 }),
    ]);

    const combined = [
      ...profiles.map(mapUserProfileRecord),
      ...inquiries.map(mapInquiryRecord),
    ].sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());

    const pagedItems = combined.slice(skip, skip + limit);

    return res.json({
      success: true,
      data: {
        items: pagedItems,
        pagination: {
          page,
          limit,
          total: combined.length,
          totalPages: Math.ceil(combined.length / limit) || 1,
        },
      },
    });
  } catch (error) {
    return next(error);
  }
}

export async function verifyKyc(req, res, next) {
  try {
    const review = await findReviewRecord(req.params.userId);

    if (!review?.doc) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
        code: "NOT_FOUND",
      });
    }

    review.doc.kycStatus = "verified";
    review.doc.kycRemarks = "";
    review.doc.verifiedAt = new Date();
    review.doc.rejectedAt = null;
    if (review.recordType === "inquiry") {
      review.doc.actionHistory = Array.isArray(review.doc.actionHistory) ? review.doc.actionHistory : [];
      review.doc.actionHistory.push({
        type: "kyc_verified",
        title: "KYC Verified",
        note: "Admin verified the customer KYC submission.",
        status: "VERIFIED",
        actor: "Admin",
        createdAt: new Date(),
      });
    }
    await review.doc.save();

    return res.json({
      success: true,
      data:
        review.recordType === "profile"
          ? mapUserProfileRecord(review.doc)
          : mapInquiryRecord(review.doc),
    });
  } catch (error) {
    return next(error);
  }
}

export async function rejectKyc(req, res, next) {
  try {
    const remarks = String(req.body.remarks || "").trim().slice(0, 500);
    const review = await findReviewRecord(req.params.userId);

    if (!review?.doc) {
      return res.status(404).json({
        success: false,
        message: "Profile not found",
        code: "NOT_FOUND",
      });
    }

    review.doc.kycStatus = "rejected";
    review.doc.kycRemarks = remarks;
    review.doc.rejectedAt = new Date();
    review.doc.verifiedAt = null;
    if (review.recordType === "inquiry") {
      review.doc.actionHistory = Array.isArray(review.doc.actionHistory) ? review.doc.actionHistory : [];
      review.doc.actionHistory.push({
        type: "kyc_rejected",
        title: "KYC Rejected",
        note: remarks || "Admin rejected the customer KYC submission.",
        status: "KYC_REJECTED",
        actor: "Admin",
        createdAt: new Date(),
      });
    }
    await review.doc.save();

    return res.json({
      success: true,
      data:
        review.recordType === "profile"
          ? mapUserProfileRecord(review.doc)
          : mapInquiryRecord(review.doc),
    });
  } catch (error) {
    return next(error);
  }
}
