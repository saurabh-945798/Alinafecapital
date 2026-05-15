import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { loanProductService } from "../services/loanProduct.service.js";
import { createLoanProductSchema, updateLoanProductSchema } from "../validators/loanProduct.validator.js";
import { writeAdminAudit } from "../utils/adminAudit.js";

export const loanProductController = {
  // PUBLIC
  listPublic: async (req, res) => {
    const items = await loanProductService.listPublic(req.query);
    res.json(new ApiResponse({ message: "Loan products fetched", data: items }));
  },

  getBySlugPublic: async (req, res) => {
    const item = await loanProductService.getBySlugPublic(req.params.slug);
    res.json(new ApiResponse({ message: "Loan product fetched", data: item }));
  },

  // ADMIN
  adminListAll: async (req, res) => {
    const items = await loanProductService.adminListAll(req.query);
    res.json(new ApiResponse({ message: "All loan products fetched", data: items }));
  },

  adminCreate: async (req, res) => {
    const parsed = createLoanProductSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.issues);
    }

    const created = await loanProductService.create(parsed.data);
    await writeAdminAudit(req, {
      action: "LOAN_PRODUCT_CREATED",
      targetType: "LoanProduct",
      targetId: created?._id,
      newValue: created,
    });
    res.status(201).json(new ApiResponse({ message: "Loan product created", data: created }));
  },

  adminUpdate: async (req, res) => {
    const parsed = updateLoanProductSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.issues);
    }

    const updated = await loanProductService.adminUpdate(req.params.id, parsed.data);
    await writeAdminAudit(req, {
      action: "LOAN_PRODUCT_UPDATED",
      targetType: "LoanProduct",
      targetId: updated?._id || req.params.id,
      newValue: updated,
    });
    res.json(new ApiResponse({ message: "Loan product updated", data: updated }));
  },

  adminDelete: async (req, res) => {
    const updated = await loanProductService.adminSoftDelete(req.params.id);
    await writeAdminAudit(req, {
      action: "LOAN_PRODUCT_DELETED",
      targetType: "LoanProduct",
      targetId: updated?._id || req.params.id,
      newValue: updated,
    });
    res.json(new ApiResponse({ message: "Loan product deactivated", data: updated }));
  },
};
