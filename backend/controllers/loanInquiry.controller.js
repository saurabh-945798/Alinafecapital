import { z } from "zod";
import mongoose from "mongoose";
import crypto from "crypto";
import fs from "fs";
import { LoanInquiry } from "../models/LoanInquiry.model.js";
import { LoanProduct } from "../models/LoanProduct.model.js";
import { normalizePhone } from "../utils/normalize.js";
import { calculateProfileCompletion } from "../utils/profileCompletion.js";

const PUBLIC_LOAN_TYPES = [
  { slug: "home-loan", name: "Home Loan" },
  { slug: "education-loan", name: "Education Loan" },
  { slug: "vehicle-loan", name: "Vehicle Loan" },
  { slug: "business-loan", name: "Business Loan" },
  { slug: "agriculture-loan", name: "Agriculture Loan" },
  { slug: "personal-loan", name: "Personal Loan" },
];

const publicCreateSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(6),
  email: z.string().trim().email(),
  address: z.string().trim().min(5),
  dateOfBirth: z.string().trim().min(8),
  gender: z.enum(["male", "female"]),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"]),
  dependants: z.coerce.number().int().min(0).max(20),
  housingStatus: z.enum(["tenant", "home_owner"]),
  employmentStatus: z.enum(["employed", "not_employed"]),
  borrowerType: z.enum(["first_time", "repeat"]),
  loanProductSlug: z.string().trim().min(2),
  loanProductName: z.string().trim().min(2).optional(),
  monthlyIncome: z.coerce.number().min(0).optional(),
  requestedAmount: z.coerce.number().gt(0),
  preferredTenureMonths: z.coerce.number().int().min(1),
  notes: z.string().trim().min(3).max(1000),
});

const adminListSchema = z.object({
  status: z.string().trim().optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const adminUpdateSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "KYC_SENT", "KYC_REJECTED", "APPROVED", "CLOSED", "QUALIFIED"]).optional(),
  adminNote: z.string().trim().max(1000).optional(),
  closeReason: z.string().trim().max(200).optional(),
});

const publicProfileUpdateSchema = z.object({
  addressLine1: z.string().trim().min(3),
  city: z.string().trim().min(2),
  district: z.string().trim().min(2),
  country: z.string().trim().default("Malawi"),
  employmentType: z.string().trim().min(2),
  governmentId: z.string().trim().optional().or(z.literal("")),
  monthlyIncome: z.coerce.number().gt(0),
  bankName: z.string().trim().min(2),
  accountNumber: z.string().trim().min(3),
  branchCode: z.string().trim().min(2),
  reference1Name: z.string().trim().min(2),
  reference1Phone: z.string().trim().min(6),
  reference2Name: z.string().trim().min(2),
  reference2Phone: z.string().trim().min(6),
}).superRefine((data, ctx) => {
  const employmentType = String(data.employmentType || "").trim().toLowerCase();
  if (employmentType === "government employee" && !String(data.governmentId || "").trim()) {
    ctx.addIssue({
      code: "custom",
      path: ["governmentId"],
      message: "Government ID is required for government employees.",
    });
  }
});

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

const fileExists = (value = "") => Boolean(value) && fs.existsSync(String(value));

const sanitizeInquiryAssets = async (inquiry) => {
  if (!inquiry) return inquiry;

  let changed = false;

  if (inquiry.avatarPath && !fileExists(inquiry.avatarPath)) {
    inquiry.avatarPath = "";
    inquiry.avatarUrl = "";
    changed = true;
  }

  const currentDocs = Array.isArray(inquiry.documents) ? inquiry.documents : [];
  const validDocs = currentDocs.filter((doc) => fileExists(doc?.filePath));
  if (validDocs.length !== currentDocs.length) {
    inquiry.documents = validDocs;
    changed = true;
  }

  if (changed) {
    syncInquiryCompletion(inquiry);
    await inquiry.save({ validateBeforeSave: false });
  }

  return inquiry;
};

const toPublicInquiryProfile = (inquiry) => {
  if (!inquiry) return null;
  const obj = inquiry.toObject ? inquiry.toObject() : inquiry;
  const { avatarPath, publicAccessToken, ...safe } = obj;

  return {
    ...safe,
    documents: (obj.documents || []).map((d) => ({
      type: d.type,
      fileUrl: d.fileUrl,
      mime: d.mime,
      uploadedAt: d.uploadedAt,
    })),
  };
};

const syncInquiryCompletion = (inquiry) => {
  inquiry.profileCompletion = calculateProfileCompletion(inquiry);
  return inquiry.profileCompletion;
};

const generatePublicAccessToken = () => crypto.randomBytes(24).toString("hex");

const pushActionHistory = (inquiry, entry) => {
  inquiry.actionHistory = Array.isArray(inquiry.actionHistory) ? inquiry.actionHistory : [];
  inquiry.actionHistory.push({
    actor: "System",
    ...entry,
    createdAt: entry.createdAt || new Date(),
  });
};

export const loanInquiryController = {
  createPublic: async (req, res) => {
    const parsed = publicCreateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.issues,
      });
    }

    const payload = parsed.data;
    const loanProductSlug = String(payload.loanProductSlug || "").trim().toLowerCase();
    const publicLoanType = PUBLIC_LOAN_TYPES.find((item) => item.slug === loanProductSlug);
    const loanProduct = await LoanProduct.findOne({ slug: loanProductSlug, status: "active" })
      .select("_id slug name")
      .lean();

    if (!loanProduct && !publicLoanType) {
      return res.status(400).json({
        success: false,
        message: "Selected loan product is not available",
        code: "INVALID_LOAN_PRODUCT",
      });
    }

    const inquiry = await LoanInquiry.create({
      fullName: payload.fullName,
      phone: normalizePhone(payload.phone),
      email: payload.email || "",
      address: payload.address,
      dateOfBirth: new Date(payload.dateOfBirth),
      gender: payload.gender,
      maritalStatus: payload.maritalStatus,
      dependants: payload.dependants,
      housingStatus: payload.housingStatus,
      employmentStatus: payload.employmentStatus,
      borrowerType: payload.borrowerType,
      addressLine1: payload.address,
      loanProductSlug: loanProduct?.slug || publicLoanType.slug,
      loanProductName:
        loanProduct?.name ||
        payload.loanProductName ||
        publicLoanType?.name ||
        loanProductSlug,
      monthlyIncome: payload.monthlyIncome,
      requestedAmount: payload.requestedAmount,
      preferredTenureMonths: payload.preferredTenureMonths,
      notes: payload.notes || "",
      source: "website",
      status: "NEW",
      publicAccessToken: generatePublicAccessToken(),
      actionHistory: [
        {
          type: "inquiry_created",
          title: "Inquiry Created",
          note: "Customer submitted a new loan inquiry.",
          status: "NEW",
          actor: "Customer",
          createdAt: new Date(),
        },
      ],
    });

    return res.status(201).json({
      success: true,
      data: {
        id: inquiry._id,
        message: "Inquiry submitted successfully",
      },
    });
  },

  publicProfile: async (req, res) => {
    const inquiry = await sanitizeInquiryAssets(req.inquiry);

    return res.json({
      success: true,
      data: toPublicInquiryProfile(inquiry),
    });
  },

  publicProfileUpdate: async (req, res) => {
    const parsed = publicProfileUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
        details: parsed.error.issues,
      });
    }

    const inquiry = req.inquiry;
    const payload = parsed.data;

    inquiry.addressLine1 = payload.addressLine1;
    inquiry.address = payload.addressLine1;
    inquiry.city = payload.city;
    inquiry.district = payload.district;
    inquiry.country = payload.country || "Malawi";
    inquiry.employmentType = payload.employmentType;
    inquiry.governmentId = payload.governmentId || "";
    inquiry.monthlyIncome = Number(payload.monthlyIncome);
    inquiry.bankName = payload.bankName;
    inquiry.accountNumber = payload.accountNumber;
    inquiry.branchCode = payload.branchCode;
    inquiry.reference1Name = payload.reference1Name;
    inquiry.reference1Phone = payload.reference1Phone;
    inquiry.reference2Name = payload.reference2Name;
    inquiry.reference2Phone = payload.reference2Phone;

    syncInquiryCompletion(inquiry);
    await inquiry.save();

    return res.json({
      success: true,
      data: toPublicInquiryProfile(inquiry),
    });
  },

  publicDocUpload: async (req, res) => {
    const inquiry = req.inquiry;
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

    inquiry.documents = (inquiry.documents || []).filter((d) => d.type !== type);
    inquiry.documents.push({
      type,
      fileUrl: toPublicFileUrl(req.file.path),
      filePath: req.file.path,
      mime: req.file.mimetype,
      uploadedAt: new Date(),
    });

    syncInquiryCompletion(inquiry);
    await inquiry.save();

    return res.json({
      success: true,
      data: toPublicInquiryProfile(inquiry),
    });
  },

  publicAvatarUpload: async (req, res) => {
    const inquiry = req.inquiry;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Avatar file is required",
        code: "VALIDATION_ERROR",
      });
    }

    const previousAvatarPath = inquiry.avatarPath || "";
    inquiry.avatarPath = req.file.path;
    inquiry.avatarUrl = toPublicFileUrl(req.file.path);
    syncInquiryCompletion(inquiry);
    await inquiry.save();

    if (previousAvatarPath && previousAvatarPath !== inquiry.avatarPath && fs.existsSync(previousAvatarPath)) {
      try {
        fs.unlinkSync(previousAvatarPath);
      } catch {
        // ignore cleanup failure
      }
    }

    return res.json({
      success: true,
      data: toPublicInquiryProfile(inquiry),
    });
  },

  publicSubmitKyc: async (req, res) => {
    const inquiry = req.inquiry;
    syncInquiryCompletion(inquiry);

    if (!String(inquiry.avatarUrl || "").trim()) {
      await inquiry.save();
      return res.status(400).json({
        success: false,
        message: "Profile photo is required before KYC submission",
        code: "AVATAR_REQUIRED",
      });
    }

    if (inquiry.profileCompletion !== 100) {
      await inquiry.save();
      return res.status(400).json({
        success: false,
        message: "Profile must be 100% complete before submission",
        code: "PROFILE_INCOMPLETE",
      });
    }

    inquiry.kycStatus = "pending";
    inquiry.submittedAt = new Date();
    inquiry.verifiedAt = null;
    inquiry.rejectedAt = null;
    if (inquiry.status === "NEW" || inquiry.status === "CONTACTED") {
      inquiry.status = "KYC_SENT";
      inquiry.kycSentAt = new Date();
    }
    pushActionHistory(inquiry, {
      type: "profile_kyc_submitted",
      title: "Profile + KYC Submitted",
      note: "Customer completed profile details and uploaded KYC documents.",
      status: inquiry.status,
      actor: "Customer",
    });
    await inquiry.save();

    return res.json({
      success: true,
      data: toPublicInquiryProfile(inquiry),
    });
  },

  adminList: async (req, res) => {
    const parsed = adminListSchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
      });
    }

    const { status, q, page, limit } = parsed.data;
    const filter = {};

    if (status && status !== "ALL") {
      const normalizedStatus = status.toUpperCase();
      if (normalizedStatus === "VERIFIED") {
        filter.kycStatus = "verified";
      } else {
        filter.status = normalizedStatus;
      }
    }

    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { fullName: { $regex: safe, $options: "i" } },
        { phone: { $regex: safe, $options: "i" } },
        { email: { $regex: safe, $options: "i" } },
        { loanProductSlug: { $regex: safe, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      LoanInquiry.countDocuments(filter),
      LoanInquiry.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ]);

    const patchedItems = await Promise.all(
      items.map(async (item) => {
        const updates = {};
        const nextItem = { ...item };
        if (item.avatarPath && !fileExists(item.avatarPath)) {
          updates.avatarPath = "";
          updates.avatarUrl = "";
          nextItem.avatarPath = "";
          nextItem.avatarUrl = "";
        }
        if (Array.isArray(item.documents)) {
          const validDocs = item.documents.filter((doc) => fileExists(doc?.filePath));
          if (validDocs.length !== item.documents.length) {
            updates.documents = validDocs;
            nextItem.documents = validDocs;
          }
        }
        if (Object.keys(updates).length > 0) {
          updates.profileCompletion = calculateProfileCompletion(nextItem);
        }
        const nextToken = generatePublicAccessToken();
        if (!item.publicAccessToken) {
          updates.publicAccessToken = nextToken;
        }
        if (Object.keys(updates).length > 0) {
          const refreshed = await LoanInquiry.findByIdAndUpdate(
            item._id,
            { $set: updates },
            { new: true, lean: true }
          );
          return refreshed || { ...item, ...updates, publicAccessToken: updates.publicAccessToken || item.publicAccessToken };
        }
        return item;
      })
    );

    return res.json({
      success: true,
      data: {
        items: patchedItems,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
    });
  },

  adminGetById: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inquiry id",
        code: "VALIDATION_ERROR",
      });
    }

    const doc = await LoanInquiry.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
        code: "NOT_FOUND",
      });
    }

    if (!doc.publicAccessToken) {
      doc.publicAccessToken = generatePublicAccessToken();
    }
    await sanitizeInquiryAssets(doc);

    return res.json({
      success: true,
      data: doc.toObject(),
    });
  },

  adminUpdate: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inquiry id",
        code: "VALIDATION_ERROR",
      });
    }

    const parsed = adminUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
      });
    }

    const doc = await LoanInquiry.findById(req.params.id);

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
        code: "NOT_FOUND",
      });
    }

    const previousStatus = doc.status;
    const previousAdminNote = doc.adminNote || "";

    if (parsed.data.status) {
      if (parsed.data.status === "APPROVED" && doc.kycStatus !== "verified") {
        return res.status(400).json({
          success: false,
          message: "KYC must be verified before the inquiry can be approved.",
          code: "KYC_NOT_VERIFIED",
        });
      }

      doc.status = parsed.data.status;
      if (parsed.data.status === "CONTACTED") {
        doc.contactedAt = new Date();
      }
      if (parsed.data.status === "KYC_SENT" && !doc.publicAccessToken) {
        doc.publicAccessToken = generatePublicAccessToken();
      }
      if (parsed.data.status === "KYC_SENT") {
        doc.kycSentAt = new Date();
      }
      if (parsed.data.status === "KYC_REJECTED") {
        doc.kycStatus = "rejected";
        doc.rejectedAt = new Date();
        doc.verifiedAt = null;
        doc.kycRemarks = String(parsed.data.adminNote || doc.adminNote || "").trim();
      }
      if (parsed.data.status === "APPROVED") {
        doc.approvedAt = new Date();
      }
      if (parsed.data.status === "CLOSED") {
        doc.closedAt = new Date();
      }
    }
    if (parsed.data.adminNote !== undefined) {
      doc.adminNote = parsed.data.adminNote;
    }
    if (parsed.data.closeReason !== undefined) {
      doc.closeReason = parsed.data.closeReason;
    }

    if (doc.status === "CLOSED" && !String(doc.closeReason || "").trim()) {
      return res.status(400).json({
        success: false,
        message: "Close reason is required before closing the inquiry.",
        code: "CLOSE_REASON_REQUIRED",
      });
    }

    if (parsed.data.status && parsed.data.status !== previousStatus) {
      pushActionHistory(doc, {
        type: "status_updated",
        title: `Status changed to ${parsed.data.status}`,
        note:
          parsed.data.status === "CLOSED" && doc.closeReason
            ? `Close reason: ${doc.closeReason}`
            : String(parsed.data.adminNote || "").trim(),
        status: parsed.data.status,
        actor: "Admin",
      });
    } else if (
      parsed.data.adminNote !== undefined &&
      String(parsed.data.adminNote || "").trim() !== String(previousAdminNote || "").trim()
    ) {
      pushActionHistory(doc, {
        type: "note_updated",
        title: "Admin Note Updated",
        note: String(parsed.data.adminNote || "").trim(),
        status: doc.status,
        actor: "Admin",
      });
    }

    await doc.save();

    return res.json({ success: true, data: doc.toObject() });
  },
};
