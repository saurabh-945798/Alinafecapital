import mongoose from "mongoose";
import { z } from "zod";
import { LoanAccount } from "../models/LoanAccount.model.js";

const listSchema = z.object({
  status: z.string().trim().optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const loanAccountController = {
  adminList: async (req, res) => {
    const parsed = listSchema.safeParse(req.query);
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
      filter.status = String(status).toUpperCase();
    }

    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { customerName: { $regex: safe, $options: "i" } },
        { phone: { $regex: safe, $options: "i" } },
        { email: { $regex: safe, $options: "i" } },
        { accountNumber: { $regex: safe, $options: "i" } },
        { applicationCode: { $regex: safe, $options: "i" } },
        { loanProductName: { $regex: safe, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      LoanAccount.countDocuments(filter),
      LoanAccount.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
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

  adminGetById: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid account id",
        code: "VALIDATION_ERROR",
      });
    }

    const doc = await LoanAccount.findById(req.params.id).lean();
    if (!doc) {
      return res.status(404).json({
        success: false,
        message: "Loan account not found",
        code: "NOT_FOUND",
      });
    }

    return res.json({
      success: true,
      data: doc,
    });
  },
};
