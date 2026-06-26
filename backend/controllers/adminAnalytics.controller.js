import { LoanInquiry } from "../models/LoanInquiry.model.js";

const STATUS_VALUES = [
  "NEW",
  "CONTACTED",
  "KYC_SENT",
  "KYC_REJECTED",
  "VERIFIED",
  "APPROVED",
  "AUTHORIZED",
  "DISBURSED",
  "CLOSED",
  "QUALIFIED",
];

const escapeRegex = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parseDate = (value, endOfDay = false) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  if (endOfDay) date.setHours(23, 59, 59, 999);
  else date.setHours(0, 0, 0, 0);
  return date;
};

const normalizeStatus = (value = "") => String(value || "").trim().toUpperCase();

const getStageExpression = () => ({
  $switch: {
    branches: [
      { case: { $eq: ["$status", "DISBURSED"] }, then: "DISBURSED" },
      { case: { $eq: ["$status", "AUTHORIZED"] }, then: "AUTHORIZED" },
      { case: { $eq: ["$status", "APPROVED"] }, then: "APPROVED" },
      { case: { $eq: ["$status", "CLOSED"] }, then: "CLOSED" },
      { case: { $eq: ["$kycStatus", "verified"] }, then: "VERIFIED" },
      {
        case: {
          $or: [
            { $eq: ["$kycStatus", "rejected"] },
            { $eq: ["$status", "KYC_REJECTED"] },
          ],
        },
        then: "KYC_REJECTED",
      },
      { case: { $eq: ["$status", "KYC_SENT"] }, then: "KYC_SENT" },
      { case: { $eq: ["$status", "CONTACTED"] }, then: "CONTACTED" },
    ],
    default: "NEW",
  },
});

const buildMatch = (query = {}) => {
  const match = {};
  const from = parseDate(query.from);
  const to = parseDate(query.to, true);

  if (from || to) {
    match.createdAt = {};
    if (from) match.createdAt.$gte = from;
    if (to) match.createdAt.$lte = to;
  }

  const status = normalizeStatus(query.status);
  if (status && status !== "ALL") {
    if (status === "VERIFIED") {
      match.kycStatus = "verified";
      match.status = { $nin: ["APPROVED", "AUTHORIZED", "DISBURSED", "CLOSED"] };
    } else if (STATUS_VALUES.includes(status)) {
      match.status = status;
    }
  }

  const loanProduct = String(query.loanProduct || "").trim();
  if (loanProduct && loanProduct.toUpperCase() !== "ALL") {
    const safe = escapeRegex(loanProduct);
    match.$or = [
      { loanProductSlug: { $regex: `^${safe}$`, $options: "i" } },
      { loanProductName: { $regex: `^${safe}$`, $options: "i" } },
    ];
  }

  return match;
};

const runFacet = async (match) => {
  const [result = {}] = await LoanInquiry.aggregate([
    { $match: match },
    { $addFields: { analyticsStage: getStageExpression() } },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalApplications: { $sum: 1 },
              totalRequestedAmount: { $sum: { $ifNull: ["$requestedAmount", 0] } },
              pending: {
                $sum: {
                  $cond: [{ $in: ["$analyticsStage", ["NEW", "CONTACTED", "KYC_SENT"]] }, 1, 0],
                },
              },
              verified: { $sum: { $cond: [{ $eq: ["$analyticsStage", "VERIFIED"] }, 1, 0] } },
              approved: { $sum: { $cond: [{ $eq: ["$analyticsStage", "APPROVED"] }, 1, 0] } },
              authorized: { $sum: { $cond: [{ $eq: ["$analyticsStage", "AUTHORIZED"] }, 1, 0] } },
              disbursed: { $sum: { $cond: [{ $eq: ["$analyticsStage", "DISBURSED"] }, 1, 0] } },
              rejected: { $sum: { $cond: [{ $eq: ["$analyticsStage", "KYC_REJECTED"] }, 1, 0] } },
              closed: { $sum: { $cond: [{ $eq: ["$analyticsStage", "CLOSED"] }, 1, 0] } },
            },
          },
        ],
        applicationsOverTime: [
          {
            $group: {
              _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
              count: { $sum: 1 },
            },
          },
          { $sort: { _id: 1 } },
          { $project: { _id: 0, date: "$_id", count: 1 } },
        ],
        byStatus: [
          { $group: { _id: "$analyticsStage", count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $project: { _id: 0, status: "$_id", count: 1 } },
        ],
        byProduct: [
          {
            $group: {
              _id: {
                product: { $ifNull: ["$loanProductName", "Unassigned"] },
                slug: { $ifNull: ["$loanProductSlug", ""] },
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1, "_id.product": 1 } },
          { $project: { _id: 0, product: "$_id.product", slug: "$_id.slug", count: 1 } },
        ],
        kycProgress: [
          { $group: { _id: { $ifNull: ["$kycStatus", "not_started"] }, count: { $sum: 1 } } },
          { $sort: { count: -1, _id: 1 } },
          { $project: { _id: 0, status: { $toUpper: "$_id" }, count: 1 } },
        ],
        recentApplications: [
          { $sort: { createdAt: -1 } },
          { $limit: 10 },
          {
            $project: {
              _id: 0,
              id: "$_id",
              applicationNo: { $ifNull: ["$applicationCode", ""] },
              customerName: { $ifNull: ["$fullName", ""] },
              loanProductName: { $ifNull: ["$loanProductName", ""] },
              loanProductSlug: { $ifNull: ["$loanProductSlug", ""] },
              status: "$analyticsStage",
              requestedAmount: { $ifNull: ["$requestedAmount", 0] },
              createdAt: "$createdAt",
            },
          },
        ],
      },
    },
  ]);

  return result;
};

export const getAdminAnalyticsSummary = async (req, res) => {
  const match = buildMatch(req.query || {});
  const result = await runFacet(match);
  const totals = result.totals?.[0] || {};

  return res.json({
    success: true,
    data: {
      kpis: {
        totalApplications: totals.totalApplications || 0,
        pending: totals.pending || 0,
        verified: totals.verified || 0,
        approved: totals.approved || 0,
        authorized: totals.authorized || 0,
        disbursed: totals.disbursed || 0,
        rejected: totals.rejected || 0,
        closed: totals.closed || 0,
        totalRequestedAmount: totals.totalRequestedAmount || 0,
      },
      applicationsOverTime: result.applicationsOverTime || [],
      byStatus: result.byStatus || [],
      byProduct: result.byProduct || [],
      kycProgress: result.kycProgress || [],
      recentApplications: result.recentApplications || [],
    },
  });
};
