import { LoanApplication } from "../models/LoanApplication.model.js";
import UserProfile from "../models/UserProfile.js";
import User from "../models/User.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {
  adminUpdateStatusSchema,
  listAdminApplicationsSchema,
} from "../validators/adminApplication.validator.js";

const STATUS_TRANSITIONS = {
  PRE_APPLICATION: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["UNDER_REVIEW", "REJECTED", "CANCELLED"],
  PENDING: ["UNDER_REVIEW", "REJECTED", "CANCELLED"],
  UNDER_REVIEW: ["APPROVED", "REJECTED", "CANCELLED"],
  APPROVED: ["DISBURSED", "CANCELLED"],
  REJECTED: [],
  DISBURSED: [],
  CANCELLED: [],
};

const SLA_HOURS = 24;

const toUtcDateStart = (raw) => {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(0, 0, 0, 0);
  return d;
};

const toUtcDateEnd = (raw) => {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  d.setHours(23, 59, 59, 999);
  return d;
};

const computeSla = (createdAt, status) => {
  const now = Date.now();
  const created = new Date(createdAt).getTime();
  const ageHours = Math.max(0, Math.floor((now - created) / (1000 * 60 * 60)));

  const isOpen =
    status === "PRE_APPLICATION" ||
    status === "SUBMITTED" ||
    status === "PENDING" ||
    status === "UNDER_REVIEW";
  const slaBreached = isOpen && ageHours > SLA_HOURS;

  let ageBucket = "<24h";
  if (ageHours > 48) ageBucket = ">48h";
  else if (ageHours >= 24) ageBucket = "24-48h";

  return { ageHours, ageBucket, slaBreached };
};

export const adminApplicationController = {

  listAll: async (req, res) => {
    const parsed = listAdminApplicationsSchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ApiError(400, "Validation failed", "VALIDATION_ERROR");
    }

    const { page, limit, sortBy, sortOrder, status, q, from, to, queue } = parsed.data;

    const filter = {};
    if (queue === "precheck") {
      filter.status = "PRE_APPLICATION";
    } else if (queue === "applications") {
      filter.status = {
        $in: ["SUBMITTED", "UNDER_REVIEW", "APPROVED", "REJECTED", "DISBURSED", "CANCELLED"],
      };
    }

    if (status) {
      const statuses = status
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      if (statuses.length) {
        filter.status = statuses.length === 1 ? statuses[0] : { $in: statuses };
      }
    }

    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { fullName: { $regex: safe, $options: "i" } },
        { phone: { $regex: safe, $options: "i" } },
        { email: { $regex: safe, $options: "i" } },
        { productSlug: { $regex: safe, $options: "i" } },
      ];
    }

    if (from || to) {
      filter.createdAt = {};
      if (from) {
        const fromDate = toUtcDateStart(from);
        if (!fromDate) throw new ApiError(400, "Invalid 'from' date", "INVALID_DATE");
        filter.createdAt.$gte = fromDate;
      }
      if (to) {
        const toDate = toUtcDateEnd(to);
        if (!toDate) throw new ApiError(400, "Invalid 'to' date", "INVALID_DATE");
        filter.createdAt.$lte = toDate;
      }
    }

    const sort = { [sortBy]: sortOrder === "asc" ? 1 : -1 };
    const skip = (page - 1) * limit;

    const [total, docs] = await Promise.all([
      LoanApplication.countDocuments(filter),
      LoanApplication.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    ]);

    const userIds = docs
      .map((d) => d?.userId)
      .filter(Boolean)
      .map((id) => String(id));
    const uniqueUserIds = Array.from(new Set(userIds));

    const profiles = uniqueUserIds.length
      ? await UserProfile.find({ userId: { $in: uniqueUserIds } })
          .select("userId profileCompletion kycStatus updatedAt")
          .lean()
      : [];

    const profileMap = new Map(
      profiles.map((p) => [String(p.userId), p])
    );

    const items = docs.map((doc) => {
      const profile = doc.userId ? profileMap.get(String(doc.userId)) : null;
      return {
        ...doc,
        profileSummary: profile
          ? {
              profileCompletion: Number(profile.profileCompletion || 0),
              kycStatus: profile.kycStatus || "not_started",
              profileUpdatedAt: profile.updatedAt || null,
            }
          : null,
        sla: computeSla(doc.createdAt, doc.status),
      };
    });

    res.json(
      new ApiResponse({
        message: "Applications fetched",
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
    const doc = await LoanApplication.findById(req.params.id).lean();
    if (!doc) throw new ApiError(404, "Application not found", "NOT_FOUND");

    let applicantProfile = null;
    if (doc.userId) {
      const [profile, user] = await Promise.all([
        UserProfile.findOne({ userId: doc.userId }).lean(),
        User.findById(doc.userId).select("fullName email phone").lean(),
      ]);

      applicantProfile = {
        userId: String(doc.userId),
        fullName: profile?.fullName || user?.fullName || doc.fullName || "",
        email: profile?.email || user?.email || doc.email || "",
        phone: profile?.phone || user?.phone || doc.phone || "",
        addressLine1: profile?.addressLine1 || "",
        city: profile?.city || "",
        district: profile?.district || "",
        country: profile?.country || "Malawi",
        employmentType: profile?.employmentType || "",
        monthlyIncome: Number(profile?.monthlyIncome || 0),
        bankName: profile?.bankName || "",
        accountNumber: profile?.accountNumber || "",
        branchCode: profile?.branchCode || "",
        profileCompletion: Number(profile?.profileCompletion || 0),
        kycStatus: profile?.kycStatus || "not_started",
        kycRemarks: profile?.kycRemarks || "",
        submittedAt: profile?.submittedAt || null,
        verifiedAt: profile?.verifiedAt || null,
        rejectedAt: profile?.rejectedAt || null,
        documents: Array.isArray(profile?.documents) ? profile.documents : [],
      };
    }

    res.json(
      new ApiResponse({
        message: "Application fetched",
        data: {
          ...doc,
          applicantProfile,
          sla: computeSla(doc.createdAt, doc.status),
        },
      })
    );
  },

  updateStatus: async (req, res) => {
    const parsed = adminUpdateStatusSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Validation failed", "VALIDATION_ERROR");
    }

    const {
      status,
      note,
      reasonCode,
      disbursementReference,
      disbursedAmount,
      disbursedAt,
    } = parsed.data;

    const doc = await LoanApplication.findById(req.params.id);
    if (!doc) throw new ApiError(404, "Application not found", "NOT_FOUND");

    if (doc.status === status) {
      throw new ApiError(400, "Status is already set", "NO_STATUS_CHANGE");
    }

    const nextAllowed = STATUS_TRANSITIONS[doc.status] || [];
    if (!nextAllowed.includes(status)) {
      throw new ApiError(
        400,
        `Invalid status transition: ${doc.status} -> ${status}`,
        "INVALID_STATUS_TRANSITION"
      );
    }

    doc.status = status;

    const adminActor =
      req.user?.email ||
      req.user?.phone ||
      req.user?._id?.toString() ||
      "admin";

    doc.statusHistory.push({
      status,
      note: note || "",
      reasonCode: (reasonCode || "").toUpperCase(),
      updatedBy: adminActor,
      updatedAt: new Date(),
    });

    if (status === "DISBURSED") {
      const amount = Number(disbursedAmount || 0);
      if (amount > Number(doc.requestedAmount || 0)) {
        throw new ApiError(
          400,
          "Disbursed amount cannot be greater than requested amount",
          "INVALID_DISBURSEMENT_AMOUNT"
        );
      }
      doc.disbursement = {
        reference: disbursementReference || "",
        amount,
        disbursedAt: disbursedAt ? new Date(disbursedAt) : new Date(),
        note: note || "",
        updatedBy: adminActor,
        updatedAt: new Date(),
      };
    }

    await doc.save();

    res.json(
      new ApiResponse({
        message: "Application status updated",
        data: {
          id: doc._id,
          status: doc.status,
          statusHistory: doc.statusHistory,
          disbursement: doc.disbursement || null,
        },
      })
    );
  },
};
