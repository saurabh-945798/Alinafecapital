import { LoanApplication } from "../models/LoanApplication.model.js";
import UserProfile from "../models/UserProfile.js";
import User from "../models/User.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {
  adminUpdateStatusSchema,
  listAdminApplicationsSchema,
} from "../validators/adminApplication.validator.js";
import { canTransitionLoanApplication } from "../utils/workflowPolicy.js";
import { writeAdminAudit } from "../utils/adminAudit.js";
import { hasAnyRole } from "../utils/rbac.js";

const SLA_HOURS = 24;

const shapeApplicationForRole = (item, user, { detail = false } = {}) => {
  if (hasAnyRole(user, ["SUPER_ADMIN", "RISK_ANALYST", "APPROVAL", "AUTHORIZED", "AUDITOR"])) {
    return item;
  }

  if (hasAnyRole(user, ["DISBURSED"])) {
    const result = { ...item };
    if (result.applicantProfile) {
      result.applicantProfile = {
        ...result.applicantProfile,
        documents: [],
        kycRemarks: "",
      };
    }
    return result;
  }

  if (hasAnyRole(user, ["CUSTOMER_SERVICE"])) {
    return {
      _id: item._id,
      fullName: item.fullName,
      phone: item.phone,
      email: item.email,
      productSlug: item.productSlug,
      requestedAmount: item.requestedAmount,
      tenureMonths: item.tenureMonths,
      status: item.status,
      precheckReason: item.precheckReason,
      disbursement: item.disbursement
        ? { amount: item.disbursement.amount || 0, disbursedAt: item.disbursement.disbursedAt || null }
        : null,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      profileSummary: item.profileSummary || null,
      applicantProfile: item.applicantProfile
        ? {
            userId: item.applicantProfile.userId,
            fullName: item.applicantProfile.fullName,
            email: item.applicantProfile.email,
            phone: item.applicantProfile.phone,
            addressLine1: item.applicantProfile.addressLine1,
            city: item.applicantProfile.city,
            district: item.applicantProfile.district,
            country: item.applicantProfile.country,
            profileCompletion: item.applicantProfile.profileCompletion,
            kycStatus: item.applicantProfile.kycStatus,
          }
        : null,
      sla: item.sla,
    };
  }

  if (hasAnyRole(user, ["VERIFIER"])) {
    const result = { ...item };
    delete result.calculationSnapshot;
    if (result.applicantProfile) {
      result.applicantProfile = {
        ...result.applicantProfile,
        monthlyIncome: 0,
        bankName: "",
        accountNumber: "",
        branchCode: "",
      };
    }
    return result;
  }

  // Loan Operations receives the application workflow and basic customer details,
  // but not KYC files, bank details or hidden calculation internals.
  if (hasAnyRole(user, ["LOAN_OPERATIONS"])) {
    const result = { ...item };
    delete result.calculationSnapshot;
    if (result.applicantProfile) {
      result.applicantProfile = {
        ...result.applicantProfile,
        documents: [],
        bankName: "",
        accountNumber: "",
        branchCode: "",
        kycRemarks: "",
      };
    }
    return result;
  }

  return detail ? item : item;
};

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
      const item = {
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
      return shapeApplicationForRole(item, req.user);
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
        data: shapeApplicationForRole(
          {
            ...doc,
            applicantProfile,
            sla: computeSla(doc.createdAt, doc.status),
          },
          req.user,
          { detail: true }
        ),
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
      expectedCurrentStatus,
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
    if (expectedCurrentStatus && String(doc.status || "").toUpperCase() !== String(expectedCurrentStatus || "").toUpperCase()) {
      throw new ApiError(
        409,
        `Application status changed by another user. Current status is ${doc.status}. Please refresh and retry.`,
        "STATUS_CONFLICT"
      );
    }

    const transition = canTransitionLoanApplication({
      fromStage: doc.status,
      toStage: status,
      role: req.user?.role,
        roles: req.user?.roles || [],
    });
    if (!transition.ok) {
      throw new ApiError(
        transition.code === "ROLE_ACTION_FORBIDDEN" ? 403 : 400,
        transition.message,
        transition.code
      );
    }

    const oldValue = {
      status: doc.status,
      disbursement: doc.disbursement || null,
    };
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
    await writeAdminAudit(req, {
      action: "APPLICATION_STATUS_UPDATED",
      targetType: "LoanApplication",
      targetId: doc._id,
      oldValue,
      newValue: { status: doc.status, disbursement: doc.disbursement || null },
    });

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
