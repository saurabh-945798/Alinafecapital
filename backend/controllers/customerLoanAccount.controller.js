import mongoose from "mongoose";
import { LoanAccount } from "../models/LoanAccount.model.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { normalizeEmail, normalizePhone } from "../utils/normalize.js";
import { enrichLoanAccount } from "../services/loanAccountSummary.service.js";

const buildOwnerFilter = (user) => {
  const filters = [];
  const email = normalizeEmail(user?.email || "");
  const phone = normalizePhone(user?.phone || "");

  if (user?._id) filters.push({ userId: user._id });
  if (email) filters.push({ email });
  if (phone) filters.push({ phone });

  return filters.length ? { $or: filters } : { _id: null };
};

export const customerLoanAccountController = {
  listMine: async (req, res) => {
    const ownerFilter = buildOwnerFilter(req.user);
    const accounts = await LoanAccount.find(ownerFilter).sort({ createdAt: -1 }).lean();

    res.json(
      new ApiResponse({
        message: "Loan accounts fetched",
        data: {
          items: accounts.map(enrichLoanAccount),
        },
      })
    );
  },

  getMineById: async (req, res) => {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: "Invalid account id", code: "VALIDATION_ERROR" });
    }

    const account = await LoanAccount.findOne({ _id: req.params.id, ...buildOwnerFilter(req.user) }).lean();
    if (!account) {
      return res.status(404).json({ success: false, message: "Loan account not found", code: "NOT_FOUND" });
    }

    res.json(
      new ApiResponse({
        message: "Loan account fetched",
        data: enrichLoanAccount(account),
      })
    );
  },
};
