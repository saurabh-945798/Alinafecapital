import { z } from "zod";
import mongoose from "mongoose";
import crypto from "crypto";
import fs from "fs";
import { LoanInquiry } from "../models/LoanInquiry.model.js";
import { LoanProduct } from "../models/LoanProduct.model.js";
import { LoanAccount } from "../models/LoanAccount.model.js";
import { SystemCounter } from "../models/SystemCounter.model.js";
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
  status: z.enum(["NEW", "CONTACTED", "KYC_SENT", "KYC_REJECTED", "APPROVED", "DISBURSED", "CLOSED", "QUALIFIED"]).optional(),
  adminNote: z.string().trim().max(1000).optional(),
  closeReason: z.string().trim().max(200).optional(),
  approvedBy: z.string().trim().max(120).optional(),
  disbursedBy: z.string().trim().max(120).optional(),
  disbursementAmount: z.coerce.number().min(0).optional(),
  disbursementMethod: z.enum(["cash", "bank_transfer", "mobile_money"]).optional().or(z.literal("")),
  disbursementBankName: z.string().trim().max(120).optional(),
  disbursementAccountName: z.string().trim().max(120).optional(),
  disbursementAccountNumber: z.string().trim().max(120).optional(),
  disbursementMobileProvider: z.string().trim().max(120).optional(),
  disbursementMobileNumber: z.string().trim().max(30).optional(),
  transactionReference: z.string().trim().max(120).optional(),
  disbursementNote: z.string().trim().max(1000).optional(),
  fullName: z.string().trim().min(2).max(120).optional(),
  phone: z.string().trim().min(6).max(30).optional(),
  email: z.string().trim().email().optional().or(z.literal("")),
  address: z.string().trim().min(3).max(300).optional(),
  dateOfBirth: z.string().trim().optional().or(z.literal("")),
  gender: z.enum(["male", "female"]).optional(),
  maritalStatus: z.enum(["single", "married", "divorced", "widowed"]).optional(),
  dependants: z.coerce.number().int().min(0).max(20).optional(),
  housingStatus: z.enum(["tenant", "home_owner"]).optional(),
  employmentStatus: z.enum(["employed", "not_employed"]).optional(),
  borrowerType: z.enum(["first_time", "repeat"]).optional(),
  loanProductSlug: z.string().trim().min(2).max(120).optional(),
  loanProductName: z.string().trim().min(2).max(160).optional(),
  requestedAmount: z.coerce.number().min(0).optional(),
  preferredTenureMonths: z.coerce.number().int().min(1).max(120).optional(),
  notes: z.string().trim().max(1000).optional(),
  addressLine1: z.string().trim().max(300).optional(),
  city: z.string().trim().max(120).optional(),
  district: z.string().trim().max(120).optional(),
  country: z.string().trim().max(120).optional(),
  employmentType: z.string().trim().max(120).optional(),
  governmentId: z.string().trim().max(120).optional().or(z.literal("")),
  monthlyIncome: z.coerce.number().min(0).optional(),
  bankName: z.string().trim().max(120).optional(),
  accountNumber: z.string().trim().max(120).optional(),
  branchCode: z.string().trim().max(120).optional(),
  reference1Name: z.string().trim().max(120).optional(),
  reference1Phone: z.string().trim().max(30).optional(),
  reference2Name: z.string().trim().max(120).optional(),
  reference2Phone: z.string().trim().max(30).optional(),
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
  "security_offer",
  "payslip_or_business_proof",
]);

const toDocumentKey = (value = "") =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "document";

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

const resolveApplicationCodeYear = (value) => {
  const source = value ? new Date(value) : new Date();
  const year = Number.isNaN(source.getTime()) ? new Date().getFullYear() : source.getFullYear();
  return String(year);
};

const nextInquiryApplicationCode = async (dateValue) => {
  const year = resolveApplicationCodeYear(dateValue);
  const counter = await SystemCounter.findOneAndUpdate(
    { key: `loan_inquiry_application_code_${year}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return `ACL${String(counter.value).padStart(3, "0")}${year}`;
};

const nextLoanAccountNumber = async (dateValue) => {
  const year = resolveApplicationCodeYear(dateValue);
  const counter = await SystemCounter.findOneAndUpdate(
    { key: `loan_account_number_${year}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return `ACC${String(counter.value).padStart(3, "0")}${year}`;
};

const nextDisbursementReference = async (dateValue) => {
  const year = resolveApplicationCodeYear(dateValue);
  const counter = await SystemCounter.findOneAndUpdate(
    { key: `loan_disbursement_reference_${year}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return `DIS${String(counter.value).padStart(4, "0")}${year}`;
};

const resolveMonthlyRate = (inquiry) => {
  const text = `${inquiry?.loanProductName || ""} ${inquiry?.loanProductSlug || ""}`.toLowerCase();
  return text.includes("business") ? 0.075 : 0.05;
};

const addMonths = (value, monthsToAdd) => {
  const date = new Date(value || new Date());
  if (Number.isNaN(date.getTime())) return null;
  date.setMonth(date.getMonth() + monthsToAdd);
  return date;
};

const ensureLoanAccountForInquiry = async (inquiry) => {
  if (!inquiry) return null;

  const monthlyRate = resolveMonthlyRate(inquiry);
  const disbursedAt = inquiry.disbursedAt || new Date();
  const nextDueDate = addMonths(disbursedAt, 1);
  const approvedAmount = Number(inquiry.requestedAmount || 0);
  const disbursedAmount = Number(inquiry.disbursementAmount || approvedAmount || 0);

  let account = null;
  if (inquiry.loanAccountId) {
    account = await LoanAccount.findById(inquiry.loanAccountId);
  }
  if (!account) {
    account = await LoanAccount.findOne({ inquiryId: inquiry._id });
  }

  if (!account) {
    account = new LoanAccount({
      accountNumber: await nextLoanAccountNumber(disbursedAt),
      inquiryId: inquiry._id,
    });
  }

  account.applicationCode = inquiry.applicationCode || "";
  account.customerName = inquiry.fullName || "";
  account.phone = inquiry.phone || "";
  account.email = inquiry.email || "";
  account.loanProductSlug = inquiry.loanProductSlug || "";
  account.loanProductName = inquiry.loanProductName || "";
  account.approvedAmount = approvedAmount;
  account.disbursedAmount = disbursedAmount;
  account.tenureMonths = Number(inquiry.preferredTenureMonths || 1);
  account.monthlyRate = monthlyRate;
  account.processingFeeRate = 0.025;
  account.adminFeeRate = 0.025;
  account.verifiedBy = inquiry.verifiedBy || "";
  account.approvedBy = inquiry.approvedBy || "";
  account.disbursedBy = inquiry.disbursedBy || "";
  account.disbursementMethod = inquiry.disbursementMethod || "";
  account.disbursementBankName = inquiry.disbursementBankName || "";
  account.disbursementAccountName = inquiry.disbursementAccountName || "";
  account.disbursementAccountNumber = inquiry.disbursementAccountNumber || "";
  account.disbursementMobileProvider = inquiry.disbursementMobileProvider || "";
  account.disbursementMobileNumber = inquiry.disbursementMobileNumber || "";
  account.transactionReference = inquiry.transactionReference || "";
  account.disbursementNote = inquiry.disbursementNote || "";
  account.approvedAt = inquiry.approvedAt || null;
  account.disbursedAt = inquiry.disbursedAt || null;
  account.nextDueDate = nextDueDate;
  account.outstandingBalance = disbursedAmount;
  account.status = "ACTIVE";
  await account.save();

  if (!inquiry.loanAccountId || String(inquiry.loanAccountId) !== String(account._id)) {
    inquiry.loanAccountId = account._id;
  }

  return account;
};

const ensureInquiryApplicationCode = async (inquiry) => {
  if (!inquiry || String(inquiry.applicationCode || "").trim()) return inquiry;
  inquiry.applicationCode = await nextInquiryApplicationCode(inquiry.createdAt);
  await inquiry.save({ validateBeforeSave: false });
  return inquiry;
};

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
      applicationCode: await nextInquiryApplicationCode(new Date()),
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
    const inquiry = await ensureInquiryApplicationCode(await sanitizeInquiryAssets(req.inquiry));

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

    const inquiry = await ensureInquiryApplicationCode(req.inquiry);
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
    const inquiry = await ensureInquiryApplicationCode(req.inquiry);
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
    const inquiry = await ensureInquiryApplicationCode(req.inquiry);

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
    const inquiry = await ensureInquiryApplicationCode(req.inquiry);
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
        if (!item.applicationCode) {
          updates.applicationCode = await nextInquiryApplicationCode(item.createdAt);
        }
        if (Object.keys(updates).length > 0) {
          const refreshed = await LoanInquiry.findByIdAndUpdate(
            item._id,
            { $set: updates },
            { new: true, lean: true }
          );
          return refreshed || {
            ...item,
            ...updates,
            publicAccessToken: updates.publicAccessToken || item.publicAccessToken,
          };
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
    await ensureInquiryApplicationCode(doc);

    return res.json({
      success: true,
      data: doc.toObject(),
    });
  },

  adminUploadDoc: async (req, res) => {
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

    const displayName = String(req.body.displayName || "").trim();
    if (!displayName) {
      return res.status(400).json({
        success: false,
        message: "Document name is required",
        code: "VALIDATION_ERROR",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "Document file is required",
        code: "VALIDATION_ERROR",
      });
    }

    const type = String(req.body.type || "").trim() || toDocumentKey(displayName);

    const previousDoc = (doc.documents || []).find((entry) => entry.type === type);
    doc.documents = (doc.documents || []).filter((entry) => entry.type !== type);
    doc.documents.push({
      type,
      displayName,
      fileUrl: toPublicFileUrl(req.file.path),
      filePath: req.file.path,
      mime: req.file.mimetype,
      uploadedAt: new Date(),
    });

    syncInquiryCompletion(doc);
    await doc.save();

    if (previousDoc?.filePath && fs.existsSync(previousDoc.filePath)) {
      try {
        fs.unlinkSync(previousDoc.filePath);
      } catch {
        // ignore cleanup failure
      }
    }

    return res.json({ success: true, data: doc.toObject() });
  },

  adminRemoveDoc: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid inquiry id",
        code: "VALIDATION_ERROR",
      });
    }

    const type = String(req.params.type || "").trim();
    if (!type) {
      return res.status(400).json({
        success: false,
        message: "Invalid document type",
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

    const previousDoc = (doc.documents || []).find((entry) => entry.type === type);
    doc.documents = (doc.documents || []).filter((entry) => entry.type !== type);
    syncInquiryCompletion(doc);
    await doc.save();

    if (previousDoc?.filePath && fs.existsSync(previousDoc.filePath)) {
      try {
        fs.unlinkSync(previousDoc.filePath);
      } catch {
        // ignore cleanup failure
      }
    }

    return res.json({ success: true, data: doc.toObject() });
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
    const selectedDisbursementMethod = String(
      parsed.data.disbursementMethod ?? doc.disbursementMethod ?? ""
    ).trim();

    if (parsed.data.status) {
      if (parsed.data.status === "APPROVED" && doc.kycStatus !== "verified") {
        return res.status(400).json({
          success: false,
          message: "KYC must be verified before the inquiry can be approved.",
          code: "KYC_NOT_VERIFIED",
        });
      }
      if (parsed.data.status === "DISBURSED" && doc.status !== "APPROVED") {
        return res.status(400).json({
          success: false,
          message: "The inquiry must be approved before loan disbursement.",
          code: "APPROVAL_REQUIRED",
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
        if (!String(parsed.data.approvedBy || doc.approvedBy || "").trim()) {
          return res.status(400).json({
            success: false,
            message: "Approved by is required before approving the inquiry.",
            code: "APPROVED_BY_REQUIRED",
          });
        }
        doc.approvedAt = new Date();
        doc.approvedBy = String(parsed.data.approvedBy || doc.approvedBy || "").trim();
      }
      if (parsed.data.status === "DISBURSED") {
        if (!String(parsed.data.disbursedBy || doc.disbursedBy || "").trim()) {
          return res.status(400).json({
            success: false,
            message: "Disbursed by is required before disbursing the loan.",
            code: "DISBURSED_BY_REQUIRED",
          });
        }
        const amount = Number(parsed.data.disbursementAmount ?? doc.disbursementAmount ?? doc.requestedAmount ?? 0);
        if (!amount || amount <= 0) {
          return res.status(400).json({
            success: false,
            message: "Disbursement amount is required before disbursing the loan.",
            code: "DISBURSEMENT_AMOUNT_REQUIRED",
          });
        }
        if (!selectedDisbursementMethod) {
          return res.status(400).json({
            success: false,
            message: "Disbursement method is required before disbursing the loan.",
            code: "DISBURSEMENT_METHOD_REQUIRED",
          });
        }
        if (selectedDisbursementMethod === "bank_transfer") {
          if (!String(parsed.data.disbursementBankName || doc.disbursementBankName || "").trim()) {
            return res.status(400).json({
              success: false,
              message: "Bank name is required for bank transfer disbursement.",
              code: "DISBURSEMENT_BANK_NAME_REQUIRED",
            });
          }
          if (!String(parsed.data.disbursementAccountName || doc.disbursementAccountName || "").trim()) {
            return res.status(400).json({
              success: false,
              message: "Account name is required for bank transfer disbursement.",
              code: "DISBURSEMENT_ACCOUNT_NAME_REQUIRED",
            });
          }
          if (!String(parsed.data.disbursementAccountNumber || doc.disbursementAccountNumber || "").trim()) {
            return res.status(400).json({
              success: false,
              message: "Account number is required for bank transfer disbursement.",
              code: "DISBURSEMENT_ACCOUNT_NUMBER_REQUIRED",
            });
          }
        }
        if (selectedDisbursementMethod === "mobile_money") {
          if (!String(parsed.data.disbursementMobileProvider || doc.disbursementMobileProvider || "").trim()) {
            return res.status(400).json({
              success: false,
              message: "Mobile money provider is required for mobile money disbursement.",
              code: "DISBURSEMENT_MOBILE_PROVIDER_REQUIRED",
            });
          }
          if (!String(parsed.data.disbursementMobileNumber || doc.disbursementMobileNumber || "").trim()) {
            return res.status(400).json({
              success: false,
              message: "Mobile money number is required for mobile money disbursement.",
              code: "DISBURSEMENT_MOBILE_NUMBER_REQUIRED",
            });
          }
        }
        doc.disbursedAt = new Date();
        doc.disbursedBy = String(parsed.data.disbursedBy || doc.disbursedBy || "").trim();
        doc.disbursementAmount = amount;
        doc.disbursementMethod = selectedDisbursementMethod;
        doc.disbursementBankName = String(parsed.data.disbursementBankName || doc.disbursementBankName || "").trim();
        doc.disbursementAccountName = String(parsed.data.disbursementAccountName || doc.disbursementAccountName || "").trim();
        doc.disbursementAccountNumber = String(parsed.data.disbursementAccountNumber || doc.disbursementAccountNumber || "").trim();
        doc.disbursementMobileProvider = String(parsed.data.disbursementMobileProvider || doc.disbursementMobileProvider || "").trim();
        doc.disbursementMobileNumber = String(parsed.data.disbursementMobileNumber || doc.disbursementMobileNumber || "").trim();
        if (selectedDisbursementMethod !== "bank_transfer") {
          doc.disbursementBankName = "";
          doc.disbursementAccountName = "";
          doc.disbursementAccountNumber = "";
        }
        if (selectedDisbursementMethod !== "mobile_money") {
          doc.disbursementMobileProvider = "";
          doc.disbursementMobileNumber = "";
        }
        doc.transactionReference =
          String(doc.transactionReference || "").trim() || (await nextDisbursementReference(doc.disbursedAt));
        doc.disbursementNote = String(parsed.data.disbursementNote || doc.disbursementNote || "").trim();
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
    if (parsed.data.approvedBy !== undefined) {
      doc.approvedBy = parsed.data.approvedBy;
    }
    if (parsed.data.disbursedBy !== undefined) doc.disbursedBy = parsed.data.disbursedBy;
    if (parsed.data.disbursementAmount !== undefined) doc.disbursementAmount = parsed.data.disbursementAmount;
    if (parsed.data.disbursementMethod !== undefined) doc.disbursementMethod = parsed.data.disbursementMethod;
    if (parsed.data.disbursementBankName !== undefined) doc.disbursementBankName = parsed.data.disbursementBankName;
    if (parsed.data.disbursementAccountName !== undefined) doc.disbursementAccountName = parsed.data.disbursementAccountName;
    if (parsed.data.disbursementAccountNumber !== undefined) doc.disbursementAccountNumber = parsed.data.disbursementAccountNumber;
    if (parsed.data.disbursementMobileProvider !== undefined) doc.disbursementMobileProvider = parsed.data.disbursementMobileProvider;
    if (parsed.data.disbursementMobileNumber !== undefined) doc.disbursementMobileNumber = parsed.data.disbursementMobileNumber;
    if (parsed.data.disbursementNote !== undefined) doc.disbursementNote = parsed.data.disbursementNote;
    if (parsed.data.fullName !== undefined) doc.fullName = parsed.data.fullName;
    if (parsed.data.phone !== undefined) doc.phone = normalizePhone(parsed.data.phone);
    if (parsed.data.email !== undefined) doc.email = parsed.data.email;
    if (parsed.data.address !== undefined) doc.address = parsed.data.address;
    if (parsed.data.dateOfBirth !== undefined) {
      doc.dateOfBirth = parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null;
    }
    if (parsed.data.gender !== undefined) doc.gender = parsed.data.gender;
    if (parsed.data.maritalStatus !== undefined) doc.maritalStatus = parsed.data.maritalStatus;
    if (parsed.data.dependants !== undefined) doc.dependants = parsed.data.dependants;
    if (parsed.data.housingStatus !== undefined) doc.housingStatus = parsed.data.housingStatus;
    if (parsed.data.employmentStatus !== undefined) doc.employmentStatus = parsed.data.employmentStatus;
    if (parsed.data.borrowerType !== undefined) doc.borrowerType = parsed.data.borrowerType;
    if (parsed.data.loanProductSlug !== undefined) doc.loanProductSlug = parsed.data.loanProductSlug;
    if (parsed.data.loanProductName !== undefined) doc.loanProductName = parsed.data.loanProductName;
    if (parsed.data.requestedAmount !== undefined) doc.requestedAmount = parsed.data.requestedAmount;
    if (parsed.data.preferredTenureMonths !== undefined) doc.preferredTenureMonths = parsed.data.preferredTenureMonths;
    if (parsed.data.notes !== undefined) doc.notes = parsed.data.notes;
    if (parsed.data.addressLine1 !== undefined) {
      doc.addressLine1 = parsed.data.addressLine1;
      if (!parsed.data.address && parsed.data.addressLine1) {
        doc.address = parsed.data.addressLine1;
      }
    }
    if (parsed.data.city !== undefined) doc.city = parsed.data.city;
    if (parsed.data.district !== undefined) doc.district = parsed.data.district;
    if (parsed.data.country !== undefined) doc.country = parsed.data.country;
    if (parsed.data.employmentType !== undefined) doc.employmentType = parsed.data.employmentType;
    if (parsed.data.governmentId !== undefined) doc.governmentId = parsed.data.governmentId;
    if (parsed.data.monthlyIncome !== undefined) doc.monthlyIncome = parsed.data.monthlyIncome;
    if (parsed.data.bankName !== undefined) doc.bankName = parsed.data.bankName;
    if (parsed.data.accountNumber !== undefined) doc.accountNumber = parsed.data.accountNumber;
    if (parsed.data.branchCode !== undefined) doc.branchCode = parsed.data.branchCode;
    if (parsed.data.reference1Name !== undefined) doc.reference1Name = parsed.data.reference1Name;
    if (parsed.data.reference1Phone !== undefined) doc.reference1Phone = parsed.data.reference1Phone;
    if (parsed.data.reference2Name !== undefined) doc.reference2Name = parsed.data.reference2Name;
    if (parsed.data.reference2Phone !== undefined) doc.reference2Phone = parsed.data.reference2Phone;

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
          title:
          parsed.data.status === "DISBURSED"
            ? "Loan Disbursed"
            : `Status changed to ${parsed.data.status}`,
        note:
          parsed.data.status === "DISBURSED"
            ? `Disbursed by: ${doc.disbursedBy}${doc.disbursementMethod ? `, Method: ${doc.disbursementMethod}` : ""}${doc.transactionReference ? `, Ref: ${doc.transactionReference}` : ""}`
            : parsed.data.status === "CLOSED" && doc.closeReason
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

    if (doc.status === "DISBURSED") {
      await ensureLoanAccountForInquiry(doc);
    }

    await doc.save();

    return res.json({ success: true, data: doc.toObject() });
  },
};
