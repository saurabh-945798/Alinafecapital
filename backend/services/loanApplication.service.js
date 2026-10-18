import mongoose from "mongoose";
import { LoanProduct } from "../models/LoanProduct.model.js";
import { LoanApplication } from "../models/LoanApplication.model.js";
import { LoanInquiry } from "../models/LoanInquiry.model.js";
import { LoanAccount } from "../models/LoanAccount.model.js";
import UserProfile from "../models/UserProfile.js";
import { emiCalculatorService } from "./emiCalculator.service.js";
import { ApiError } from "../utils/ApiError.js";
import { calculateProfileCompletion } from "../utils/profileCompletion.js";
import { normalizeEmail, normalizePhone } from "../utils/normalize.js";
import { withCurrentLoanFeePolicy } from "../utils/loanPricingPolicy.js";

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
  adminFeeType: p.adminFeeType,
  adminFeeValue: p.adminFeeValue,
  overduePenaltyRatePercent: p.overduePenaltyRatePercent,
  loanAdministrationFeeMonthly: 0,

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

const INQUIRY_TO_DASHBOARD_STATUS = {
  NEW: "UNDER_REVIEW",
  CONTACTED: "UNDER_REVIEW",
  KYC_SENT: "PENDING",
  QUALIFIED: "UNDER_REVIEW",
  KYC_REJECTED: "REJECTED",
  APPROVED: "APPROVED",
  AUTHORIZED: "APPROVED",
  DISBURSED: "DISBURSED",
  CLOSED: "CANCELLED",
};

const normalizeDashboardStatus = (status) => {
  const raw = String(status || "").toUpperCase();
  return INQUIRY_TO_DASHBOARD_STATUS[raw] || raw || "PENDING";
};

const unique = (values = []) => [...new Set(values.filter(Boolean).map((value) => String(value)))];

const buildCustomerOwnership = (user = {}) => {
  const userId = user?._id ? String(user._id) : "";
  const email = normalizeEmail(user?.email || "");
  const phone = normalizePhone(user?.phone || "");
  const rawPhone = String(user?.phone || "").trim();

  const appOr = [];
  if (userId && mongoose.Types.ObjectId.isValid(userId)) appOr.push({ userId: user._id });
  unique([phone, rawPhone]).forEach((value) => appOr.push({ phone: value }));
  if (email) appOr.push({ email });

  const inquiryOr = [];
  unique([phone, rawPhone]).forEach((value) => inquiryOr.push({ phone: value }));
  if (email) inquiryOr.push({ email });

  return { appOr, inquiryOr, email, phone, userId };
};

const buildLoanAccountOwnership = (user = {}) => {
  const filters = [];
  const userId = user?._id ? String(user._id) : "";
  const email = normalizeEmail(user?.email || "");
  const phone = normalizePhone(user?.phone || "");

  if (userId && mongoose.Types.ObjectId.isValid(userId)) filters.push({ userId: user._id });
  if (email) filters.push({ email });
  if (phone) filters.push({ phone });

  return filters.length ? { $or: filters } : { _id: null };
};

const mapLoanAccountToCustomerApplication = (account = {}) => ({
  _id: String(account._id),
  id: String(account._id),
  sourceType: "loan_account",
  sourceLabel: "Disbursed Loan Account",
  applicationCode: account.applicationCode || account.accountNumber || String(account._id),
  fullName: account.customerName || "",
  phone: account.phone || "",
  email: account.email || "",
  productSlug: account.loanProductSlug || "",
  productName: account.loanProductName || account.loanProductSlug || "",
  loanProductSlug: account.loanProductSlug || "",
  loanProductName: account.loanProductName || account.loanProductSlug || "",
  requestedAmount: Number(account.approvedAmount || account.disbursedAmount || 0),
  amount: Number(account.approvedAmount || account.disbursedAmount || 0),
  tenureMonths: Number(account.tenureMonths || 0),
  preferredTenureMonths: Number(account.tenureMonths || 0),
  status: "DISBURSED",
  rawStatus: "DISBURSED",
  loanAccountId: String(account._id),
  loanAccountNumber: account.accountNumber || "",
  isRepayable: true,
  disbursedAt: account.disbursedAt || null,
  outstandingBalance: Number(account.outstandingBalance || 0),
  statusHistory: [
    {
      status: "DISBURSED",
      rawStatus: "DISBURSED",
      note: account.accountNumber
        ? `Loan account ${account.accountNumber} is active for repayment.`
        : "Loan account is active for repayment.",
      reasonCode: "LOAN_ACCOUNT",
      updatedBy: "System",
      updatedAt: account.disbursedAt || account.createdAt || account.updatedAt,
    },
  ],
  createdAt: account.disbursedAt || account.createdAt,
  updatedAt: account.updatedAt || account.disbursedAt || account.createdAt,
});

const matchesCurrentUser = (doc = {}, user = {}) => {
  const { email, phone, userId } = buildCustomerOwnership(user);
  const docUserId = doc?.userId ? String(doc.userId) : "";
  const docEmail = normalizeEmail(doc?.email || "");
  const docPhone = normalizePhone(doc?.phone || "");

  return Boolean(
    (userId && docUserId && docUserId === userId) ||
      (email && docEmail && docEmail === email) ||
      (phone && docPhone && docPhone === phone)
  );
};

const mapInquiryToCustomerApplication = (inquiry = {}) => {
  const rawStatus = String(inquiry.status || "").toUpperCase();
  const mappedStatus = normalizeDashboardStatus(rawStatus);
  const actionHistory = Array.isArray(inquiry.actionHistory) ? inquiry.actionHistory : [];

  return {
    _id: String(inquiry._id),
    id: String(inquiry._id),
    sourceType: "loan_inquiry",
    sourceLabel: "Website Loan Inquiry",
    applicationCode: inquiry.applicationCode || "",
    fullName: inquiry.fullName || "",
    phone: inquiry.phone || "",
    email: inquiry.email || "",
    productSlug: inquiry.loanProductSlug || "",
    productName: inquiry.loanProductName || inquiry.loanProductSlug || "",
    loanProductSlug: inquiry.loanProductSlug || "",
    loanProductName: inquiry.loanProductName || inquiry.loanProductSlug || "",
    requestedAmount: Number(inquiry.requestedAmount || 0),
    amount: Number(inquiry.requestedAmount || 0),
    tenureMonths: Number(inquiry.preferredTenureMonths || 0),
    preferredTenureMonths: Number(inquiry.preferredTenureMonths || 0),
    monthlyIncome: Number(inquiry.monthlyIncome || 0),
    status: mappedStatus,
    rawStatus,
    kycStatus: inquiry.kycStatus || "not_started",
    precheckReason: "",
    loanAccountId: inquiry.loanAccountId || null,
    isRepayable: rawStatus === "DISBURSED" && !!inquiry.loanAccountId,
    statusHistory: actionHistory.map((entry) => ({
      status: normalizeDashboardStatus(entry.status || rawStatus),
      rawStatus: entry.status || rawStatus,
      note: entry.note || entry.title || "",
      reasonCode: entry.type || "INQUIRY_UPDATE",
      updatedBy: entry.actor || "Admin",
      updatedAt: entry.createdAt || inquiry.updatedAt || inquiry.createdAt,
    })),
    inquiryDetails: {
      publicAccessToken: inquiry.publicAccessToken || "",
      adminNote: inquiry.adminNote || "",
      kycRemarks: inquiry.kycRemarks || "",
      approvedBy: inquiry.approvedBy || "",
      authorizedBy: inquiry.authorizedBy || "",
      disbursedBy: inquiry.disbursedBy || "",
      approvedAt: inquiry.approvedAt || null,
      authorizedAt: inquiry.authorizedAt || null,
      disbursedAt: inquiry.disbursedAt || null,
      transactionReference: inquiry.transactionReference || "",
    },
    createdAt: inquiry.createdAt,
    updatedAt: inquiry.updatedAt,
  };
};

const mapLoanApplicationToCustomerApplication = (doc = {}) => ({
  ...doc,
  _id: String(doc._id),
  id: String(doc._id),
  sourceType: "loan_application",
  sourceLabel: "Customer Dashboard Application",
  applicationCode: doc.applicationCode || String(doc._id),
  productName: doc.productSnapshot?.name || doc.productSlug || "",
  loanProductName: doc.productSnapshot?.name || doc.productSlug || "",
});

const getComparableValue = (item, sortBy) => {
  if (sortBy === "requestedAmount") return Number(item.requestedAmount || 0);
  if (sortBy === "status") return String(item.status || "");
  if (sortBy === "updatedAt") return new Date(item.updatedAt || item.createdAt || 0).getTime();
  return new Date(item.createdAt || item.updatedAt || 0).getTime();
};

const applyCustomerFilters = (items = [], query = {}) => {
  const statusParam = String(query.status || "").trim().toUpperCase();
  const q = String(query.q || "").trim().toLowerCase();

  let next = items;
  if (statusParam && statusParam !== "ALL") {
    next = next.filter((item) => String(item.status || "").toUpperCase() === statusParam);
  }

  if (q) {
    next = next.filter((item) => {
      const haystack = [
        item.applicationCode,
        item.productSlug,
        item.productName,
        item.loanProductName,
        item.fullName,
        item.phone,
        item.email,
        item.rawStatus,
        item.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }

  return next;
};

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

    const effectiveProduct = withCurrentLoanFeePolicy(product);

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
      productSlug: effectiveProduct.slug,
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
      productSlug: effectiveProduct.slug,
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
      product: effectiveProduct,
      amount: Number(payload.amount),
      tenureMonths: Number(payload.tenureMonths),
    });

    // 7) Save application
    const productSnapshot = pickProductSnapshot(effectiveProduct);

    const appDoc = await LoanApplication.create({
      fullName: payload.fullName,
      phone: payload.phone,
      email: payload.email || "",
      monthlyIncome: Number(payload.monthlyIncome || profile?.monthlyIncome || 0),
      userId: payload.userId || null,

      productId: product._id,
      productSlug: effectiveProduct.slug,

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
   * Get application by ID. Supports both customer-dashboard applications and
   * public loan inquiries so customers can see records that admin approved from
   * the public application/KYC flow.
   */
  async getById(id, user) {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ApiError(404, "Application not found", "NOT_FOUND");
    }

    const doc = await LoanApplication.findById(id).lean();
    if (doc) {
      if (user && !matchesCurrentUser(doc, user)) {
        throw new ApiError(403, "Forbidden", "FORBIDDEN");
      }
      return mapLoanApplicationToCustomerApplication(doc);
    }

    const inquiry = await LoanInquiry.findById(id).lean();
    if (inquiry) {
      const linkedAccount = user
        ? await LoanAccount.findOne({ inquiryId: inquiry._id, ...buildLoanAccountOwnership(user) }).lean()
        : await LoanAccount.findOne({ inquiryId: inquiry._id }).lean();
      if (user && !matchesCurrentUser(inquiry, user) && !linkedAccount) {
        throw new ApiError(403, "Forbidden", "FORBIDDEN");
      }

      const mapped = mapInquiryToCustomerApplication(inquiry);
      if (linkedAccount) {
        mapped.loanAccountId = String(linkedAccount._id);
        mapped.loanAccountNumber = linkedAccount.accountNumber || "";
        mapped.isRepayable = true;
        mapped.status = "DISBURSED";
        mapped.rawStatus = "DISBURSED";
        mapped.disbursedAt = inquiry.disbursedAt || linkedAccount.disbursedAt || null;
        mapped.outstandingBalance = Number(linkedAccount.outstandingBalance || 0);
      }
      return mapped;
    }

    const account = user
      ? await LoanAccount.findOne({ _id: id, ...buildLoanAccountOwnership(user) }).lean()
      : await LoanAccount.findById(id).lean();
    if (!account) {
      throw new ApiError(404, "Application not found", "NOT_FOUND");
    }
    return mapLoanAccountToCustomerApplication(account);
  },

  /**
   * List applications owned by the authenticated user. This now merges:
   * 1) applications submitted from the authenticated dashboard, and
   * 2) public loan inquiries created before the customer account existed.
   */
  async listMine(user, query = {}) {
    if (!user) throw new ApiError(401, "Unauthorized", "UNAUTHORIZED");

    const { appOr, inquiryOr } = buildCustomerOwnership(user);
    if (appOr.length === 0 && inquiryOr.length === 0) {
      return {
        items: [],
        pagination: { page: 1, limit: 20, total: 0, totalPages: 1 },
      };
    }

    const loanAccountOwnership = buildLoanAccountOwnership(user);
    const [applications, inquiries, loanAccounts] = await Promise.all([
      appOr.length ? LoanApplication.find({ $or: appOr }).lean() : [],
      inquiryOr.length ? LoanInquiry.find({ $or: inquiryOr }).lean() : [],
      LoanAccount.find(loanAccountOwnership).sort({ disbursedAt: -1, createdAt: -1 }).lean(),
    ]);

    const accountByInquiryId = new Map(
      loanAccounts
        .filter((account) => account.inquiryId)
        .map((account) => [String(account.inquiryId), account])
    );

    const missingInquiryIds = loanAccounts
      .map((account) => account.inquiryId)
      .filter(Boolean)
      .filter((id) => !inquiries.some((inquiry) => String(inquiry._id) === String(id)));

    const accountLinkedInquiries = missingInquiryIds.length
      ? await LoanInquiry.find({ _id: { $in: missingInquiryIds } }).lean()
      : [];

    const allInquiries = [...inquiries, ...accountLinkedInquiries];
    const seen = new Set();
    const combined = [];

    for (const application of applications.map(mapLoanApplicationToCustomerApplication)) {
      const key = `application:${application._id}`;
      if (!seen.has(key)) { seen.add(key); combined.push(application); }
    }

    for (const inquiry of allInquiries) {
      const mapped = mapInquiryToCustomerApplication(inquiry);
      const account = accountByInquiryId.get(String(inquiry._id));
      if (account) {
        mapped.loanAccountId = String(account._id);
        mapped.loanAccountNumber = account.accountNumber || "";
        mapped.isRepayable = true;
        mapped.status = "DISBURSED";
        mapped.rawStatus = "DISBURSED";
        mapped.disbursedAt = inquiry.disbursedAt || account.disbursedAt || null;
        mapped.outstandingBalance = Number(account.outstandingBalance || 0);
      }
      const key = `inquiry:${mapped._id}`;
      if (!seen.has(key)) { seen.add(key); combined.push(mapped); }
    }

    for (const account of loanAccounts) {
      const inquiryKey = account.inquiryId ? `inquiry:${String(account.inquiryId)}` : "";
      if (inquiryKey && seen.has(inquiryKey)) continue;
      const mapped = mapLoanAccountToCustomerApplication(account);
      const key = `account:${String(account._id)}`;
      if (!seen.has(key)) { seen.add(key); combined.push(mapped); }
    }

    const filtered = applyCustomerFilters(combined, query);

    const allowedSortBy = new Set(["createdAt", "updatedAt", "requestedAmount", "status"]);
    const sortBy = allowedSortBy.has(String(query.sortBy)) ? String(query.sortBy) : "createdAt";
    const sortDirection = String(query.sortOrder).toLowerCase() === "asc" ? 1 : -1;

    filtered.sort((a, b) => {
      const left = getComparableValue(a, sortBy);
      const right = getComparableValue(b, sortBy);
      if (left < right) return -1 * sortDirection;
      if (left > right) return 1 * sortDirection;
      return String(b._id).localeCompare(String(a._id));
    });

    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(50, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;
    const items = filtered.slice(skip, skip + limit);
    const total = filtered.length;

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
