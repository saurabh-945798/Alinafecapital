import { airtelMoneyService } from "../services/airtelMoney.service.js";
import { ApiResponse } from "../utils/ApiResponse.js";

export const airtelRepaymentController = {
  createCollection: async (req, res) => {
    const payment = await airtelMoneyService.createLoanRepaymentCollection({
      accountId: req.body.accountId,
      amount: req.body.amount,
      repaymentType: req.body.repaymentType || "custom",
      repaymentMonth: req.body.repaymentMonth || null,
      airtelPhone: req.body.airtelPhone || req.body.phone || req.body.msisdn,
      user: req.user,
    });

    res.status(201).json(
      new ApiResponse({
        message: "Airtel Money repayment prompt sent. Please approve it on your phone.",
        data: payment,
      })
    );
  },

  getPayment: async (req, res) => {
    const payment = await airtelMoneyService.getPaymentForClient(req.params.paymentId, req.user);
    res.json(new ApiResponse({ message: "Airtel Money repayment fetched", data: payment }));
  },

  refreshStatus: async (req, res) => {
    const payment = await airtelMoneyService.refreshStatus(req.params.paymentId, req.user);
    res.json(new ApiResponse({ message: "Airtel Money repayment status checked", data: payment }));
  },

  callback: async (req, res) => {
    const payment = await airtelMoneyService.handleCallback(req.body || {});
    res.json(new ApiResponse({ message: "Airtel Money callback received", data: payment }));
  },
};
