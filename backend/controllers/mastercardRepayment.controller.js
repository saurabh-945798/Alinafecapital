import { z } from "zod";
import { mastercardHostedSessionService } from "../services/mastercardHostedSession.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { ApiError } from "../utils/ApiError.js";
import { normalizeMoneyForValidation } from "../utils/numberInput.js";

const moneyNumberField = (schema) => z.preprocess(normalizeMoneyForValidation, schema);

const createRepaymentSessionSchema = z
  .object({
    accountId: z.string().min(10),
    amount: moneyNumberField(z.coerce.number().positive()).optional(),
    repaymentType: z.enum(["next_due", "custom", "full_settlement"]).default("custom"),
    repaymentMonth: z.coerce.number().int().min(1).optional().nullable(),
  })
  .strict();

const processPaymentSchema = z
  .object({
    // Only the Mastercard session reference is allowed here.
    // Card number, CVV, expiry and cardholder data must never be posted to this backend.
    sessionId: z.string().min(5).optional(),
  })
  .strict();

export const mastercardRepaymentController = {
  createSession: async (req, res) => {
    const parsed = createRepaymentSessionSchema.safeParse(req.body || {});
    if (!parsed.success) {
      throw new ApiError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.issues);
    }

    const payment = await mastercardHostedSessionService.createLoanRepaymentSession({
      ...parsed.data,
      user: req.user,
    });

    res.status(201).json(
      new ApiResponse({
        message: "Card repayment session created",
        data: payment,
      })
    );
  },

  getPayment: async (req, res) => {
    const payment = await mastercardHostedSessionService.getPaymentForClient(req.params.paymentId, req.user);
    res.json(
      new ApiResponse({
        message: "Repayment session fetched",
        data: payment,
      })
    );
  },


  refreshSession: async (req, res) => {
    const payment = await mastercardHostedSessionService.refreshFormSession(req.params.paymentId, req.user);
    res.json(
      new ApiResponse({
        message: "Card payment form refreshed",
        data: payment,
      })
    );
  },

  processPayment: async (req, res) => {
    const parsed = processPaymentSchema.safeParse(req.body || {});
    if (!parsed.success) {
      throw new ApiError(400, "Validation failed", "VALIDATION_ERROR", parsed.error.issues);
    }

    const payment = await mastercardHostedSessionService.processPayment({
      paymentId: req.params.paymentId,
      sessionId: parsed.data.sessionId,
      user: req.user,
    });

    res.json(
      new ApiResponse({
        message: payment.status === "PAID" ? "Loan repayment successful" : "Loan repayment processed",
        data: payment,
      })
    );
  },

  refreshOrderStatus: async (req, res) => {
    const payment = await mastercardHostedSessionService.refreshOrderStatus(req.params.paymentId, req.user);
    res.json(
      new ApiResponse({
        message: "Repayment status refreshed",
        data: payment,
      })
    );
  },
};
