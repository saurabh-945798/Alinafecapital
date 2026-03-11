import { LoanProduct } from "../models/LoanProduct.model.js";
import { LoanApplication } from "../models/LoanApplication.model.js";
import UserProfile from "../models/UserProfile.js";
import { emiCalculatorService } from "./emiCalculator.service.js";
import { ApiError } from "../utils/ApiError.js";
import { calculateProfileCompletion } from "../utils/profileCompletion.js";

/**
 * Create immutable snapshot of product at time of application
 * This protects historical applications from future product changes.
 */
const pickProductSnapshot = (p) => ({
  _id: String(p._id),
  name: p.name,
  slug: p.slug,
  description: p.description,
  currency: p.currency,

  minAmount: p.minAmount,
  maxAmount: p.maxAmount,
  minTenureMonths: p.minTenureMonths,
  maxTenureMonths: p.maxTenureMonths,

  interestType: p.interestType,
  interestRateMonthly: p.interestRateMonthly,

  processingFeeType: p.processingFeeType,
  processingFeeValue: p.processingFeeValue,

  insuranceType: p.insuranceType,
  insuranceValue: p.insuranceValue,

  taxRatePercent: p.taxRatePercent,
  repaymentFrequency: p.repaymentFrequency,

  status: p.status,
  featured: p.featured,
});

const ACTIVE_REVIEW_STATUSES = [
  "PRE_APPLICATION",
  "SUBMITTED",
  "PENDING", // legacy
  "UNDER_REVIEW",
];

const resolvePrecheck = (profile) => {
  const completion = Number(profile?.profileCompletion || 0);
  const computed = calculateProfileCompletion(profile || {});
  const effectiveCompletion = completion > 0 ? completion : computed;
  const kycStatus = String(profile?.kycStatus || "not_started").toLowerCase();

  if (effectiveCompletion < 100) {
    return {
      status: "PRE_APPLICATION",
      precheckReason: "PROFILE_INCOMPLETE",
    };
  }

  if (kycStatus === "verified") {
    return {
      status: "SUBMITTED",
      precheckReason: "",
    };
  }

  if (kycStatus === "rejected") {
    return {
      status: "PRE_APPLICATION",
      precheckReason: "KYC_REJECTED",
    };
  }

  return {
    status: "PRE_APPLICATION",
    precheckReason: "KYC_PENDING",
  };
};

export const loanApplicationService = {
  /**
   * Create Loan Application
   */
  async createApplication(payload) {
    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // 1) Find active product
    const product = await LoanProduct.findOne({
      slug: String(payload.productSlug).toLowerCase(),
      status: "active",
    });

    if (!product) {
      throw new ApiError(404, "Loan product not found", "NOT_FOUND");
    }

    // 2) Pre-check profile and KYC to decide queue
    const profile = payload.userId
      ? await UserProfile.findOne({ userId: payload.userId }).lean()
      : null;
    const { status: initialStatus, precheckReason } = resolvePrecheck(profile);

    // 3) Block new application if an active application already exists
    const identityOr = [{ phone: payload.phone }];
    if (payload.userId) identityOr.push({ userId: payload.userId });
    if (payload.email) identityOr.push({ email: String(payload.email).toLowerCase() });

    const existingInReview = await LoanApplication.findOne({
      $or: identityOr,
      status: { $in: ACTIVE_REVIEW_STATUSES },
    }).lean();

    if (existingInReview) {
      throw new ApiError(
        409,
        "You already have an active loan request. Please wait for update before applying again.",
        "ACTIVE_APPLICATION_EXISTS"
      );
    }

    // 4) Block if already approved/disbursed for same product
    const alreadyApproved = await LoanApplication.findOne({
      phone: payload.phone,
      productSlug: product.slug,
      status: { $in: ["APPROVED", "DISBURSED"] },
    }).lean();

    if (alreadyApproved) {
      throw new ApiError(
        400,
        "You already have an approved loan for this product",
        "DUPLICATE_APPROVED"
      );
    }

    // 5) Block duplicate within 24 hours (same core values)
    const recentDuplicate = await LoanApplication.findOne({
      phone: payload.phone,
      productSlug: product.slug,
      requestedAmount: Number(payload.amount),
      tenureMonths: Number(payload.tenureMonths),
      createdAt: { $gte: last24Hours },
    }).lean();

    if (recentDuplicate) {
      throw new ApiError(
        400,
        "Duplicate application detected within 24 hours",
        "DUPLICATE_APPLICATION"
      );
    }

    // 6) Calculate estimate snapshot
    const calc = emiCalculatorService.calculate({
      product,
      amount: Number(payload.amount),
      tenureMonths: Number(payload.tenureMonths),
    });

    // 7) Save application
    const productSnapshot = pickProductSnapshot(product);

    const appDoc = await LoanApplication.create({
      fullName: payload.fullName,
      phone: payload.phone,
      email: payload.email || "",
      monthlyIncome: Number(payload.monthlyIncome || profile?.monthlyIncome || 0),
      userId: payload.userId || null,

      productId: product._id,
      productSlug: product.slug,

      requestedAmount: Number(payload.amount),
      tenureMonths: Number(payload.tenureMonths),

      productSnapshot,
      calculationSnapshot: calc,

      status: initialStatus,
      precheckReason,
    });

    return appDoc;
  },

  /**
   * Get application by ID
   */
  async getById(id, user) {
    const doc = await LoanApplication.findById(id).lean();

    if (!doc) {
      throw new ApiError(404, "Application not found", "NOT_FOUND");
    }

    if (user) {
      const userId = user?._id ? String(user._id) : "";
      const ownByUserId = !!doc.userId && String(doc.userId) === userId;
      const ownByPhone = !!user?.phone && doc.phone === user.phone;
      const ownByEmail =
        !!user?.email &&
        !!doc.email &&
        String(doc.email).toLowerCase() === String(user.email).toLowerCase();

      if (!ownByUserId && !ownByPhone && !ownByEmail) {
        throw new ApiError(403, "Forbidden", "FORBIDDEN");
      }
    }

    return doc;
  },

  /**
   * List applications owned by the authenticated user
   */
  async listMine(user, query = {}) {
    if (!user) throw new ApiError(401, "Unauthorized", "UNAUTHORIZED");

    const or = [];
    if (user?._id) or.push({ userId: user._id });
    if (user?.phone) or.push({ phone: user.phone });
    if (user?.email) {
      or.push({ email: String(user.email).toLowerCase() });
    }

    if (or.length === 0) {
      return {
        items: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
      };
    }

    const filter = { $or: or };

    const statusParam = String(query.status || "").trim();
    if (statusParam && statusParam.toUpperCase() !== "ALL") {
      filter.status = statusParam.toUpperCase();
    }

    const q = String(query.q || "").trim();
    if (q) {
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const rx = new RegExp(escaped, "i");
      filter.$and = filter.$and || [];
      filter.$and.push({
        $or: [{ productSlug: rx }, { fullName: rx }, { phone: rx }, { email: rx }],
      });
    }

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const allowedSortBy = new Set(["createdAt", "updatedAt", "requestedAmount", "status"]);
    const sortBy = allowedSortBy.has(String(query.sortBy)) ? String(query.sortBy) : "createdAt";
    const sortOrder = String(query.sortOrder).toLowerCase() === "asc" ? 1 : -1;

    const [total, items] = await Promise.all([
      LoanApplication.countDocuments(filter),
      LoanApplication.find(filter)
        .sort({ [sortBy]: sortOrder, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    return {
      items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  },
};
