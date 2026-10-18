import { FinancialJournal } from "../models/FinancialJournal.model.js";
import { AdminAuditLog } from "../models/AdminAuditLog.js";

const clampLimit = (value, fallback = 100) => Math.min(250, Math.max(1, Number(value || fallback)));

export const adminFinanceController = {
  journal: async (req, res) => {
    const limit = clampLimit(req.query.limit);
    const query = {};
    if (req.query.loanAccountId) query.loanAccountId = req.query.loanAccountId;
    if (req.query.entryType) query.entryType = String(req.query.entryType).trim();
    const items = await FinancialJournal.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ success: true, data: { items } });
  },

  audit: async (req, res) => {
    const limit = clampLimit(req.query.limit);
    const query = {};
    if (req.query.action) query.action = String(req.query.action).trim();
    if (req.query.targetType) query.targetType = String(req.query.targetType).trim();
    const items = await AdminAuditLog.find(query).sort({ createdAt: -1 }).limit(limit).lean();
    return res.json({ success: true, data: { items } });
  },
};
