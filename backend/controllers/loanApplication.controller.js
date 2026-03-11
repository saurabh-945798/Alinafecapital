import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { createLoanApplicationSchema } from "../validators/loanApplication.validator.js";
import { loanApplicationService } from "../services/loanApplication.service.js";

export const loanApplicationController = {
  listMine: async (req, res) => {
    const result = await loanApplicationService.listMine(req.user, req.query);
    res.json(
      new ApiResponse({
        message: "Applications fetched",
        data: result,
      })
    );
  },

  create: async (req, res) => {
    const parsed = createLoanApplicationSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new ApiError(400, "Validation failed", "VALIDATION_ERROR");
    }

    const created = await loanApplicationService.createApplication({
      ...parsed.data,
      userId: req.user?._id ? String(req.user._id) : null,
    });

    // Return only useful fields
    res.status(201).json(
      new ApiResponse({
        message:
          created.status === "PRE_APPLICATION"
            ? "Pre-application saved. Complete profile and KYC to continue."
            : "Application submitted",
        data: {
          applicationId: created._id,
          status: created.status,
          precheckReason: created.precheckReason || "",
          productSlug: created.productSlug,
          requestedAmount: created.requestedAmount,
          tenureMonths: created.tenureMonths,
          calculation: created.calculationSnapshot,
          createdAt: created.createdAt,
        },
      })
    );
  },

  getById: async (req, res) => {
    const doc = await loanApplicationService.getById(req.params.id, req.user);
    res.json(
      new ApiResponse({
        message: "Application fetched",
        data: doc,
      })
    );
  },
};
