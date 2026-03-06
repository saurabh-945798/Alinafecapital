import { z } from "zod";
import mongoose from "mongoose";
import { LoanInquiry } from "../models/LoanInquiry.model.js";
import { LoanProduct } from "../models/LoanProduct.model.js";
import { normalizePhone } from "../utils/normalize.js";

const publicCreateSchema = z.object({
  fullName: z.string().trim().min(2),
  phone: z.string().trim().min(6),
  email: z.string().trim().email().optional().or(z.literal("")),
  loanProductSlug: z.string().trim().min(2),
  monthlyIncome: z.coerce.number().min(0).optional(),
  requestedAmount: z.coerce.number().min(0).optional(),
  preferredTenureMonths: z.coerce.number().int().min(1).optional(),
  notes: z.string().trim().max(1000).optional(),
});

const adminListSchema = z.object({
  status: z.string().trim().optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const adminUpdateSchema = z.object({
  status: z.enum(["NEW", "CONTACTED", "QUALIFIED", "CLOSED"]).optional(),
  adminNote: z.string().trim().max(1000).optional(),
});

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
    const loanProduct = await LoanProduct.findOne({ slug: loanProductSlug, status: "active" })
      .select("_id slug")
      .lean();

    if (!loanProduct) {
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
      loanProductSlug: loanProduct.slug,
      monthlyIncome: payload.monthlyIncome,
      requestedAmount: payload.requestedAmount,
      preferredTenureMonths: payload.preferredTenureMonths,
      notes: payload.notes || "",
      source: "website",
      status: "NEW",
    });

    return res.status(201).json({
      success: true,
      data: {
        id: inquiry._id,
        message: "Inquiry submitted successfully",
      },
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
      filter.status = status.toUpperCase();
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

    return res.json({
      success: true,
      data: {
        items,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit) || 1,
        },
      },
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

    const update = {};
    if (parsed.data.status) {
      update.status = parsed.data.status;
      if (parsed.data.status === "CONTACTED") {
        update.contactedAt = new Date();
      }
    }
    if (parsed.data.adminNote !== undefined) {
      update.adminNote = parsed.data.adminNote;
    }

    const doc = await LoanInquiry.findByIdAndUpdate(
      req.params.id,
      { $set: update },
      { returnDocument: "after" }
    ).lean();

    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Inquiry not found",
        code: "NOT_FOUND",
      });
    }

    return res.json({ success: true, data: doc });
  },
};
