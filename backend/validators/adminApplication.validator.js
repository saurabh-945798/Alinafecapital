import { z } from "zod";

const ADMIN_STATUS_ENUM = z.enum([
  "PRE_APPLICATION",
  "SUBMITTED",
  "PENDING",
  "UNDER_REVIEW",
  "APPROVED",
  "REJECTED",
  "DISBURSED",
  "CANCELLED",
]);

export const listAdminApplicationsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  queue: z.enum(["precheck", "applications", "all"]).optional(),
  sortBy: z
    .enum(["createdAt", "requestedAmount", "status", "updatedAt"])
    .default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  status: z.string().optional(),
  q: z.string().trim().max(100).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});

export const adminUpdateStatusSchema = z
  .object({
    status: ADMIN_STATUS_ENUM,
    note: z.string().trim().max(500).optional().default(""),
    reasonCode: z.string().trim().max(64).optional().default(""),
    disbursementReference: z.string().trim().max(100).optional().default(""),
    disbursedAmount: z.coerce.number().min(0).optional(),
    disbursedAt: z.string().datetime().optional(),
  })
  .superRefine((val, ctx) => {
    if (
      (val.status === "REJECTED" || val.status === "CANCELLED") &&
      !val.reasonCode
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reasonCode"],
        message: "reasonCode is required for REJECTED/CANCELLED",
      });
    }

    if (val.status === "DISBURSED") {
      if (!val.disbursementReference) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["disbursementReference"],
          message: "disbursementReference is required for DISBURSED",
        });
      }
      if (val.disbursedAmount === undefined || val.disbursedAmount <= 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["disbursedAmount"],
          message: "disbursedAmount must be greater than 0 for DISBURSED",
        });
      }
      if (!val.disbursedAt) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["disbursedAt"],
          message: "disbursedAt is required for DISBURSED",
        });
      }
    }
  });
