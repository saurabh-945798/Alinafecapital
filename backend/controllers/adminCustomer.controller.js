import User from "../models/User.js";
import UserProfile from "../models/UserProfile.js";
import { LoanApplication } from "../models/LoanApplication.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";

const safeRegex = (input) =>
  String(input || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const toBool = (value) => {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
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

    const [total, users] = await Promise.all([
      User.countDocuments(userFilter),
      User.find(userFilter)
        .select("fullName email phone isActive role createdAt updatedAt")
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const userIds = users.map((u) => u._id);
    const phones = users.map((u) => u.phone);

    const profileFilter = { userId: { $in: userIds } };
    if (kycStatus) profileFilter.kycStatus = kycStatus;

    const profiles = await UserProfile.find(profileFilter)
      .select("userId profileCompletion kycStatus kycRemarks verifiedAt rejectedAt updatedAt avatarUrl")
      .lean();

    const profileMap = new Map(profiles.map((p) => [String(p.userId), p]));

    const countsByPhone = await LoanApplication.aggregate([
      { $match: { phone: { $in: phones } } },
      {
        $group: {
          _id: "$phone",
          totalApplications: { $sum: 1 },
          lastApplicationAt: { $max: "$createdAt" },
        },
      },
    ]);
    const countMap = new Map(countsByPhone.map((x) => [String(x._id), x]));

    const items = users
      .map((u) => {
        const profile = profileMap.get(String(u._id)) || null;
        if (kycStatus && !profile) return null;

        const appStats = countMap.get(String(u.phone));

        return {
          id: String(u._id),
          fullName: u.fullName,
          email: u.email,
          phone: u.phone,
          role: u.role,
          isActive: !!u.isActive,
          createdAt: u.createdAt,
          updatedAt: u.updatedAt,
          profile: profile
            ? {
                profileCompletion: profile.profileCompletion ?? 0,
                kycStatus: profile.kycStatus || "not_started",
                kycRemarks: profile.kycRemarks || "",
              verifiedAt: profile.verifiedAt || null,
              rejectedAt: profile.rejectedAt || null,
              updatedAt: profile.updatedAt || null,
              avatarUrl: profile.avatarUrl || "",
            }
            : null,
          stats: {
            totalApplications: appStats?.totalApplications || 0,
            lastApplicationAt: appStats?.lastApplicationAt || null,
          },
        };
      })
      .filter(Boolean);

    res.json(
      new ApiResponse({
        message: "Customers fetched",
        data: {
          items,
          pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit) || 1,
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

    const [profile, applications] = await Promise.all([
      UserProfile.findOne({ userId: user._id })
        .select("profileCompletion kycStatus kycRemarks verifiedAt rejectedAt updatedAt avatarUrl")
        .lean(),
      LoanApplication.find({ phone: user.phone })
        .select("status requestedAmount productSlug createdAt")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean(),
    ]);

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
          profile: profile || null,
          recentApplications: applications,
        },
      })
    );
  },
};
