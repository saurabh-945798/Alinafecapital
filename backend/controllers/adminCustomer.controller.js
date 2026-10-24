import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";
import { LoanApplication } from "../models/LoanApplication.model.js";
import { LoanInquiry } from "../models/LoanInquiry.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizeEmail, normalizePhone } from "../utils/normalize.js";
import { syncLatestInquiryToCustomerProfile } from "../services/customerAccountLink.service.js";

const safeRegex = (input) =>
  String(input || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toBool = (value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
};

const normalizeId = (value) => String(value || "");

const buildLatestInquiryMap = (inquiries = []) => {
  const map = new Map();
  inquiries.forEach((inquiry) => {
    const keys = [normalizePhone(inquiry.phone || ""), normalizeEmail(inquiry.email || "")].filter(Boolean);
    keys.forEach((key) => {
      const existing = map.get(key);
      if (!existing || new Date(inquiry.updatedAt || inquiry.createdAt || 0) > new Date(existing.updatedAt || existing.createdAt || 0)) {
        map.set(key, inquiry);
      }
    });
  });
  return map;
};

const inquiryToProfileSummary = (inquiry) => {
  if (!inquiry) return null;
  return {
    profileCompletion: inquiry.profileCompletion ?? 0,
    kycStatus: inquiry.kycStatus || "not_started",
    kycRemarks: inquiry.kycRemarks || "",
    verifiedAt: inquiry.verifiedAt || null,
    rejectedAt: inquiry.rejectedAt || null,
    updatedAt: inquiry.updatedAt || inquiry.createdAt || null,
    avatarUrl: inquiry.avatarUrl || "",
    source: "loan_inquiry",
    inquiryId: normalizeId(inquiry._id),
    applicationCode: inquiry.applicationCode || "",
    loanProductName: inquiry.loanProductName || "",
    inquiryStatus: inquiry.status || "",
  };
};

const profileToSummary = (profile, latestInquiry = null) => {
  if (profile) {
    return {
      profileCompletion: profile.profileCompletion ?? latestInquiry?.profileCompletion ?? 0,
      kycStatus: profile.kycStatus || latestInquiry?.kycStatus || "not_started",
      kycRemarks: profile.kycRemarks || latestInquiry?.kycRemarks || "",
      verifiedAt: profile.verifiedAt || latestInquiry?.verifiedAt || null,
      rejectedAt: profile.rejectedAt || latestInquiry?.rejectedAt || null,
      updatedAt: profile.updatedAt || latestInquiry?.updatedAt || null,
      avatarUrl: profile.avatarUrl || latestInquiry?.avatarUrl || "",
      source: latestInquiry ? "linked_profile_and_inquiry" : "customer_profile",
      inquiryId: latestInquiry?._id ? normalizeId(latestInquiry._id) : "",
      applicationCode: latestInquiry?.applicationCode || "",
      loanProductName: latestInquiry?.loanProductName || "",
      inquiryStatus: latestInquiry?.status || "",
    };
  }
  return inquiryToProfileSummary(latestInquiry);
};

const toFullProfile = (profile, latestInquiry = null) => {
  if (profile) {
    return {
      ...profile,
      source: latestInquiry ? "linked_profile_and_inquiry" : "customer_profile",
      linkedInquiry: latestInquiry
        ? {
            id: normalizeId(latestInquiry._id),
            applicationCode: latestInquiry.applicationCode || "",
            loanProductName: latestInquiry.loanProductName || "",
            status: latestInquiry.status || "",
            kycStatus: latestInquiry.kycStatus || "not_started",
            requestedAmount: latestInquiry.requestedAmount || 0,
            preferredTenureMonths: latestInquiry.preferredTenureMonths || 0,
            createdAt: latestInquiry.createdAt || null,
            updatedAt: latestInquiry.updatedAt || null,
          }
        : null,
    };
  }

  if (!latestInquiry) return null;

  return {
    profileCompletion: latestInquiry.profileCompletion ?? 0,
    kycStatus: latestInquiry.kycStatus || "not_started",
    kycRemarks: latestInquiry.kycRemarks || "",
    verifiedAt: latestInquiry.verifiedAt || null,
    rejectedAt: latestInquiry.rejectedAt || null,
    updatedAt: latestInquiry.updatedAt || null,
    avatarUrl: latestInquiry.avatarUrl || "",
    documents: Array.isArray(latestInquiry.documents) ? latestInquiry.documents : [],
    fullName: latestInquiry.fullName || "",
    email: latestInquiry.email || "",
    phone: latestInquiry.phone || "",
    addressLine1: latestInquiry.addressLine1 || latestInquiry.address || "",
    city: latestInquiry.city || "",
    district: latestInquiry.district || latestInquiry.residenceDistrict || "",
    country: latestInquiry.country || "Malawi",
    employmentType: latestInquiry.employmentType || "",
    monthlyIncome: latestInquiry.monthlyIncome || 0,
    bankName: latestInquiry.bankName || "",
    accountNumber: latestInquiry.accountNumber || "",
    branchCode: latestInquiry.branchCode || "",
    source: "loan_inquiry",
    linkedInquiry: {
      id: normalizeId(latestInquiry._id),
      applicationCode: latestInquiry.applicationCode || "",
      loanProductName: latestInquiry.loanProductName || "",
      status: latestInquiry.status || "",
      kycStatus: latestInquiry.kycStatus || "not_started",
      requestedAmount: latestInquiry.requestedAmount || 0,
      preferredTenureMonths: latestInquiry.preferredTenureMonths || 0,
      createdAt: latestInquiry.createdAt || null,
      updatedAt: latestInquiry.updatedAt || null,
    },
  };
};

export const adminCustomerController = {
  list: async (req, res) => {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const q = (req.query.q || "").trim();
    const kycStatus = (req.query.kycStatus || "").trim();
    const isActive = toBool(req.query.isActive);
    const sortBy = ["createdAt", "fullName", "updatedAt"].includes(req.query.sortBy)
      ? req.query.sortBy
      : "createdAt";
    const sortOrder = req.query.sortOrder === "asc" ? 1 : -1;

    const userFilter = {};
    if (q) {
      const regex = { $regex: safeRegex(q), $options: "i" };
      userFilter.$or = [{ fullName: regex }, { email: regex }, { phone: regex }];
    }
    if (isActive !== null) {
      userFilter.isActive = isActive;
    }

    const users = await User.find(userFilter)
      .select("fullName email phone isActive role createdAt updatedAt")
      .sort({ [sortBy]: sortOrder })
      .lean();

    const userIds = users.map((u) => u._id);
    const phones = users.map((u) => normalizePhone(u.phone || "")).filter(Boolean);
    const emails = users.map((u) => normalizeEmail(u.email || "")).filter(Boolean);

    const [profiles, inquiries, countsByPhone] = await Promise.all([
      userIds.length
        ? UserProfile.find({ userId: { $in: userIds } })
            .select("userId profileCompletion kycStatus kycRemarks verifiedAt rejectedAt updatedAt avatarUrl")
            .lean()
        : [],
      phones.length || emails.length
        ? LoanInquiry.find({
            $or: [
              ...phones.map((phone) => ({ phone })),
              ...emails.map((email) => ({ email })),
            ],
          })
            .select("applicationCode fullName phone email loanProductName requestedAmount preferredTenureMonths status kycStatus kycRemarks profileCompletion verifiedAt rejectedAt updatedAt createdAt avatarUrl")
            .sort({ updatedAt: -1 })
            .lean()
        : [],
      phones.length
        ? LoanApplication.aggregate([
            { $match: { phone: { $in: phones } } },
            {
              $group: {
                _id: "$phone",
                totalApplications: { $sum: 1 },
                lastApplicationAt: { $max: "$createdAt" },
              },
            },
          ])
        : [],
    ]);

    const profileMap = new Map(profiles.map((p) => [String(p.userId), p]));
    const inquiryMap = buildLatestInquiryMap(inquiries);
    const countMap = new Map(countsByPhone.map((x) => [String(x._id), x]));

    const allItems = users
      .map((u) => {
        const profile = profileMap.get(String(u._id)) || null;
        const latestInquiry = inquiryMap.get(normalizePhone(u.phone || "")) || inquiryMap.get(normalizeEmail(u.email || "")) || null;
        const summary = profileToSummary(profile, latestInquiry);
        if (kycStatus && String(summary?.kycStatus || "not_started") !== kycStatus) return null;

        const appStats = countMap.get(String(normalizePhone(u.phone || "")));

        return {
          id: String(u._id),
          fullName: u.fullName,
          email: u.email,
          phone: u.phone,
          role: u.role,
          isActive: !!u.isActive,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          profile: summary,
          latestInquiry: latestInquiry
            ? {
                id: String(latestInquiry._id),
                applicationCode: latestInquiry.applicationCode || "",
                loanProductName: latestInquiry.loanProductName || "",
                status: latestInquiry.status || "",
                kycStatus: latestInquiry.kycStatus || "not_started",
                requestedAmount: latestInquiry.requestedAmount || 0,
                preferredTenureMonths: latestInquiry.preferredTenureMonths || 0,
                updatedAt: latestInquiry.updatedAt || latestInquiry.createdAt || null,
              }
            : null,
          stats: {
            totalApplications: appStats?.totalApplications || 0,
            totalInquiries: inquiries.filter((inq) => normalizePhone(inq.phone || "") === normalizePhone(u.phone || "") || normalizeEmail(inq.email || "") === normalizeEmail(u.email || "")).length,
            lastApplicationAt: appStats?.lastApplicationAt || null,
          },
        };
      })
      .filter(Boolean);

    const pagedItems = allItems.slice(skip, skip + limit);

    res.json(
      new ApiResponse({
        message: "Customers fetched",
        data: {
          items: pagedItems,
          pagination: {
            page,
            limit,
            total: allItems.length,
            totalPages: Math.ceil(allItems.length / limit) || 1,
          },
        },
      })
    );
  },

  getById: async (req, res) => {
    const user = await User.findById(req.params.id)
      .select("fullName email phone isActive role createdAt updatedAt")
      .lean();

    if (!user) throw new ApiError(404, "Customer not found", "NOT_FOUND");

    // Opportunistically sync the public inquiry KYC data into the customer's profile record.
    await syncLatestInquiryToCustomerProfile(user);

    const ownerFilter = {
      $or: [
        { phone: normalizePhone(user.phone || "") },
        { email: normalizeEmail(user.email || "") },
      ].filter((x) => Object.values(x)[0]),
    };

    const [profile, applications, inquiries] = await Promise.all([
      UserProfile.findOne({ userId: user._id }).lean(),
      LoanApplication.find({ phone: normalizePhone(user.phone || "") })
        .select("status requestedAmount productSlug createdAt")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
      LoanInquiry.find(ownerFilter.$or.length ? ownerFilter : { _id: null })
        .select("applicationCode fullName phone email loanProductSlug loanProductName requestedAmount preferredTenureMonths status kycStatus kycRemarks profileCompletion verifiedAt rejectedAt submittedAt updatedAt createdAt avatarUrl documents")
        .sort({ updatedAt: -1, createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

    const latestInquiry = inquiries[0] || null;

    res.json(
      new ApiResponse({
        message: "Customer fetched",
        data: {
          id: String(user._id),
          fullName: user.fullName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: !!user.isActive,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          profile: toFullProfile(profile, latestInquiry),
          recentApplications: applications,
          recentInquiries: inquiries.map((inquiry) => ({
            id: String(inquiry._id),
            applicationCode: inquiry.applicationCode || "",
            loanProductName: inquiry.loanProductName || inquiry.loanProductSlug || "",
            requestedAmount: inquiry.requestedAmount || 0,
            preferredTenureMonths: inquiry.preferredTenureMonths || 0,
            status: inquiry.status || "",
            kycStatus: inquiry.kycStatus || "not_started",
            createdAt: inquiry.createdAt || null,
            updatedAt: inquiry.updatedAt || null,
          })),
        },
      })
    );
  },
};
