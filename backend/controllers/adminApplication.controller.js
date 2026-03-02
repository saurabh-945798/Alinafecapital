import { LoanApplication } from "../models/LoanApplication.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import {
  adminUpdateStatusSchema,
  listAdminApplicationsSchema,
} from "../validators/adminApplication.validator.js";

const STATUS_TRANSITIONS = {
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

  const isOpen = status === "PENDING" || status === "UNDER_REVIEW";
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

    const { page, limit, sortBy, sortOrder, status, q, from, to } = parsed.data;

    const filter = {};

    if (status) {
      const statuses = status
        .split(",")
        .map((s) => s.trim().toUpperCase())
        .filter(Boolean);
      if (statuses.length) filter.status = { $in: statuses };
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

    const items = docs.map((doc) => ({
      ...doc,
      sla: computeSla(doc.createdAt, doc.status),
    }));

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

    res.json(
      new ApiResponse({
        message: "Application fetched",
        data: {
          ...doc,
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

    const explicitAdminActor =
      (req.headers["x-admin-user"] || "").toString().trim() || "";
    const key = (req.headers["x-admin-key"] || "").toString();
    const maskedKey = key ? `key:${key.slice(-4)}` : "admin";
    const adminActor = explicitAdminActor || maskedKey;

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
