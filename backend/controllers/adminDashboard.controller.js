import { LoanInquiry } from "../models/LoanInquiry.model.js";
import { LoanAccount } from "../models/LoanAccount.model.js";
import { BankPayment } from "../models/BankPayment.model.js";
import { enrichLoanAccount } from "../services/loanAccountSummary.service.js";
import { formatRoles, getUserRoles, hasAnyRole, selectPrimaryRole } from "../utils/rbac.js";

const unresolvedStatuses = ["NEW", "CONTACTED", "KYC_SENT", "KYC_REJECTED"];

const toCountMap = (rows = []) =>
  rows.reduce((acc, row) => {
    acc[row._id] = Number(row.total || 0);
    return acc;
  }, {});

export const getAdminDashboardSummary = async (req, res) => {
  const [countsAgg, verifiedKycCount, needsAction, recentApproved, loanAccounts, pendingBankPayments] = await Promise.all([
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
    LoanAccount.find({ status: { $in: ["ACTIVE", "OVERDUE"] } }).sort({ updatedAt: -1 }).lean(),
    BankPayment.find({ status: { $in: ["PENDING_VERIFICATION", "REQUIRES_CLARIFICATION"] } })
      .select("loanAccountId status amount paymentReference createdAt")
      .lean(),
  ]);

  const counts = toCountMap(countsAgg);

  const pendingByAccount = new Map();
  for (const item of pendingBankPayments) {
    const key = String(item.loanAccountId || "");
    if (!pendingByAccount.has(key)) pendingByAccount.set(key, []);
    pendingByAccount.get(key).push(item);
  }

  const overdueItems = loanAccounts
    .map((account) => enrichLoanAccount(account))
    .filter((account) => Number(account.overdueAmount || 0) > 0)
    .map((account) => ({
      _id: account._id,
      accountNumber: account.accountNumber,
      customerName: account.customerName,
      phone: account.phone,
      email: account.email,
      loanProductName: account.loanProductName,
      overdueAmount: Number(account.overdueAmount || 0),
      daysOverdue: Number(account.daysOverdue || 0),
      outstandingBalance: Number(account.outstandingBalance || 0),
      nextDueDate: account.nextDueDate,
      lastPayment: Array.isArray(account.repaymentEntries) && account.repaymentEntries.length
        ? [...account.repaymentEntries].sort((a, b) => new Date(b.paymentDate) - new Date(a.paymentDate))[0]
        : null,
      pendingPaymentVerification: pendingByAccount.get(String(account._id || "")) || [],
    }))
    .sort((a, b) => b.daysOverdue - a.daysOverdue);

  const overdue = {
    customersOverdue: overdueItems.length,
    totalOverdueAmount: overdueItems.reduce((sum, item) => sum + Number(item.overdueAmount || 0), 0),
    buckets: {
      days1to7: overdueItems.filter((item) => item.daysOverdue >= 1 && item.daysOverdue <= 7).length,
      days8to30: overdueItems.filter((item) => item.daysOverdue >= 8 && item.daysOverdue <= 30).length,
      days31to60: overdueItems.filter((item) => item.daysOverdue >= 31 && item.daysOverdue <= 60).length,
      days61plus: overdueItems.filter((item) => item.daysOverdue >= 61).length,
    },
    pendingVerificationCount: pendingBankPayments.length,
    items: overdueItems.slice(0, 50),
  };

  const applicationDetailAllowed = hasAnyRole(req.user, [
    "SUPER_ADMIN", "LOAN_OPERATIONS", "VERIFIER", "RISK_ANALYST", "APPROVAL",
    "AUTHORIZED", "DISBURSED", "CUSTOMER_SERVICE", "AUDITOR"
  ]);
  const overdueDetailAllowed = hasAnyRole(req.user, [
    "SUPER_ADMIN", "COLLECTIONS", "FINANCE_RECON", "PAYMENT_VERIFIER", "AUDITOR"
  ]);
  const technicalOnly = hasAnyRole(req.user, ["TECH_SUPPORT"]) &&
    !hasAnyRole(req.user, [
      "SUPER_ADMIN", "LOAN_OPERATIONS", "VERIFIER", "RISK_ANALYST", "APPROVAL", "AUTHORIZED",
      "DISBURSED", "PAYMENT_VERIFIER", "FINANCE_RECON", "COLLECTIONS", "CUSTOMER_SERVICE",
      "REPORTING_MIS", "AUDITOR"
    ]);

  const data = {
    metrics: technicalOnly ? {} : {
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
    needsAction: applicationDetailAllowed ? needsAction : [],
    recentApproved: applicationDetailAllowed ? recentApproved : [],
    overdue: technicalOnly
      ? { customersOverdue: 0, totalOverdueAmount: 0, buckets: {}, pendingVerificationCount: 0, items: [] }
      : { ...overdue, items: overdueDetailAllowed ? overdue.items : [] },
    accessScope: technicalOnly ? "TECHNICAL_ONLY" : "ROLE_SCOPED",
  };

  return res.json({
    success: true,
    data,
  });
};

export const getAdminWhoAmI = async (req, res) => {
  return res.json({
    success: true,
    data: {
      userId: req.user?._id || null,
      fullName: req.user?.fullName || "",
      email: req.user?.email || "",
      phone: req.user?.phone || "",
      role: selectPrimaryRole(getUserRoles(req.user)),
      roles: getUserRoles(req.user).filter((role) => role !== "user"),
      roleLabels: formatRoles(req.user),
      isActive: Boolean(req.user?.isActive),
    },
  });
};
