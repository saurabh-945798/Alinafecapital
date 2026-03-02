import { LoanProduct } from "../models/LoanProduct.model.js";
import { emiCalculatorService } from "../services/emiCalculator.service.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const emiCalculatorController = {
  calculate: async (req, res) => {
    const { productSlug, amount, tenureMonths } = req.body;

    if (!productSlug || !amount || !tenureMonths) {
      throw new ApiError(400, "Missing required fields", "VALIDATION_ERROR");
    }

    const product = await LoanProduct.findOne({
      slug: productSlug,
      status: "active",
    });

    if (!product) {
      throw new ApiError(404, "Loan product not found", "NOT_FOUND");
    }

    const result = emiCalculatorService.calculate({
      product,
      amount: Number(amount),
      tenureMonths: Number(tenureMonths),
    });

    res.json(
      new ApiResponse({
        message: "EMI calculated",
        data: result,
      })
    );
  },
};