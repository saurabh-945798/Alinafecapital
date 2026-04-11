import { z } from "zod";
import { Complaint } from "../models/Complaint.model.js";
import { SystemCounter } from "../models/SystemCounter.model.js";
import { normalizePhone } from "../utils/normalize.js";

const publicCreateSchema = z.object({
  fullName: z.string().trim().min(2).max(120),
  phone: z.string().trim().min(6).max(30),
  email: z.string().trim().email().optional().or(z.literal("")),
  subject: z.string().trim().min(3).max(160),
  message: z.string().trim().min(10).max(2000),
  preferredContact: z.enum(["phone", "email", "whatsapp"]).default("phone"),
});

const adminListSchema = z.object({
  status: z.string().trim().optional(),
  q: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

const adminUpdateSchema = z.object({
  status: z.enum(["NEW", "IN_REVIEW", "RESOLVED", "CLOSED"]).optional(),
  adminNote: z.string().trim().max(1000).optional(),
});

const resolveYear = (value) => {
  const source = value ? new Date(value) : new Date();
  return Number.isNaN(source.getTime()) ? String(new Date().getFullYear()) : String(source.getFullYear());
};

const nextComplaintCode = async (dateValue) => {
  const year = resolveYear(dateValue);
  const counter = await SystemCounter.findOneAndUpdate(
    { key: `complaint_code_${year}` },
    { $inc: { value: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return `CMP${String(counter.value).padStart(4, "0")}${year}`;
};

export const complaintController = {
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

    const complaint = await Complaint.create({
      complaintCode: await nextComplaintCode(new Date()),
      fullName: payload.fullName,
      phone: normalizePhone(payload.phone),
      email: payload.email || "",
      subject: payload.subject,
      message: payload.message,
      preferredContact: payload.preferredContact,
    });

    return res.status(201).json({
      success: true,
      data: {
        id: complaint._id,
        complaintCode: complaint.complaintCode,
        message: "Complaint submitted successfully",
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
      filter.status = String(status).toUpperCase();
    }

    if (q) {
      const safe = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      filter.$or = [
        { fullName: { $regex: safe, $options: "i" } },
        { phone: { $regex: safe, $options: "i" } },
        { email: { $regex: safe, $options: "i" } },
        { subject: { $regex: safe, $options: "i" } },
        { complaintCode: { $regex: safe, $options: "i" } },
      ];
    }

    const skip = (page - 1) * limit;
    const [total, items] = await Promise.all([
      Complaint.countDocuments(filter),
      Complaint.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
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
    const parsed = adminUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        message: "Validation failed",
        code: "VALIDATION_ERROR",
      });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: "Complaint not found",
        code: "NOT_FOUND",
      });
    }

    if (parsed.data.status !== undefined) {
      complaint.status = parsed.data.status;
      complaint.resolvedAt =
        parsed.data.status === "RESOLVED" || parsed.data.status === "CLOSED"
          ? complaint.resolvedAt || new Date()
          : null;
    }

    if (parsed.data.adminNote !== undefined) {
      complaint.adminNote = parsed.data.adminNote;
    }

    await complaint.save();

    return res.json({
      success: true,
      data: complaint.toObject(),
    });
  },
};
