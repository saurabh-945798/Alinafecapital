import { LoanInquiry } from "../models/LoanInquiry.model.js";

const unresolvedStatuses = ["NEW", "CONTACTED", "KYC_SENT", "KYC_REJECTED"];

const toCountMap = (rows = []) =>
  rows.reduce((acc, row) => {
    acc[row._id] = Number(row.total || 0);
    return acc;
  }, {});

export const getAdminDashboardSummary = async (req, res) => {
  const [countsAgg, verifiedKycCount, needsAction, recentApproved] = await Promise.all([
    LoanInquiry.aggregate([
      {
        $match: {
          status: {
            $in: ["NEW", "CONTACTED", "KYC_SENT", "KYC_REJECTED", "APPROVED", "DISBURSED", "CLOSED"],
          },
        },
      },
      {
        $group: {
          _id: "$status",
          total: { $sum: 1 },
        },
      },
    ]),
    LoanInquiry.countDocuments({ kycStatus: "verified" }),
    LoanInquiry.find({ status: { $in: unresolvedStatuses } })
      .sort({ createdAt: -1 })
      .limit(6)
      .select(
        "_id fullName phone address loanProductSlug loanProductName status kycStatus createdAt"
      )
      .lean(),
    LoanInquiry.find({ status: "APPROVED" })
      .sort({ updatedAt: -1 })
      .limit(5)
      .select("_id fullName loanProductSlug loanProductName status updatedAt")
      .lean(),
  ]);

  const counts = toCountMap(countsAgg);

  const data = {
    metrics: {
      newRequests: counts.NEW || 0,
      pendingFollowUp: counts.CONTACTED || 0,
      needsKyc: counts.KYC_SENT || 0,
      verified: verifiedKycCount || 0,
      rejected: counts.KYC_REJECTED || 0,
      approved: counts.APPROVED || 0,
      disbursed: counts.DISBURSED || 0,
      closed: counts.CLOSED || 0,
      actionRequired:
        (counts.NEW || 0) +
        (counts.CONTACTED || 0) +
        (counts.KYC_SENT || 0) +
        (counts.KYC_REJECTED || 0),
    },
    needsAction,
    recentApproved,
  };

  return res.json({
    success: true,
    data,
  });
};
