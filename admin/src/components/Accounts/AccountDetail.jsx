import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import Badge from "../ui/Badge";
import Button from "../ui/Button";
import { accountsApi } from "../../services/api/accounts.api";
import { useToast } from "../../context/ToastContext.jsx";

const ACCOUNT_STATUS_TONE = {
  ACTIVE: "green",
  OVERDUE: "red",
  CLOSED: "gray",
  SETTLED: "blue",
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
};

const formatDateOnly = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? `MWK ${amount.toLocaleString()}` : "-";
};

const humanizeValue = (value = "") => {
  const normalized = String(value || "").trim();
  if (!normalized) return "-";
  return normalized.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const calculateReducingInstallment = (principal, monthlyRate, months) => {
  if (principal <= 0 || monthlyRate <= 0 || months <= 0) return 0;
  const factor = Math.pow(1 + monthlyRate, months);
  return (principal * monthlyRate * factor) / (factor - 1);
};

const addMonths = (value, monthsToAdd) => {
  const date = new Date(value || new Date());
  if (Number.isNaN(date.getTime())) return null;
  date.setMonth(date.getMonth() + monthsToAdd);
  return date.toISOString();
};

const buildRepaymentPlan = (account) => {
  const principal = Number(account?.disbursedAmount || 0);
  const months = Number(account?.tenureMonths || 0);
  const monthlyRate = Number(account?.monthlyRate || 0);
  if (principal <= 0 || months <= 0) return null;

  const installment = calculateReducingInstallment(principal, monthlyRate, months);
  const processingFee = principal * Number(account?.processingFeeRate || 0);
  const adminFee = principal * Number(account?.adminFeeRate || 0);
  const startDate = account?.disbursedAt || account?.approvedAt || account?.createdAt || new Date().toISOString();

  let balance = principal;
  const schedule = [];

  for (let month = 1; month <= months; month += 1) {
    const openingBalance = balance;
    const interest = openingBalance * monthlyRate;
    const principalPaid = Math.max(0, installment - interest);
    balance = Math.max(0, openingBalance - principalPaid);
    const fees = month === 1 ? processingFee + adminFee : 0;

    schedule.push({
      month,
      dueDate: addMonths(startDate, month),
      openingBalance,
      principalPaid,
      interest,
      fees,
      installment: installment + fees,
      closingBalance: balance,
    });
  }

  const totalInterest = schedule.reduce((sum, row) => sum + row.interest, 0);
  return {
    monthlyRate,
    monthlyInstallment: installment,
    firstInstallment: schedule[0]?.installment || installment,
    processingFee,
    adminFee,
    totalInterest,
    totalRepayment: principal + totalInterest + processingFee + adminFee,
    schedule,
  };
};

export default function AccountDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(true);

  useEffect(() => {
    const loadDetail = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await accountsApi.getById(id);
        setItem(data || null);
      } catch (err) {
        const msg = err?.response?.data?.message || "Failed to load account details.";
        setError(msg);
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    };

    loadDetail();
  }, [id, toast]);

  const repaymentPlan = useMemo(() => buildRepaymentPlan(item), [item]);

  if (loading) {
    return <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">Loading account details...</div>;
  }

  if (!item) {
    return <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">Loan account not found.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Account Detail</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{item.accountNumber}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Post-disbursement account view for repayment and outstanding balance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.inquiryId ? (
            <Button variant="outline" onClick={() => navigate(`/admin/applications/${item.inquiryId}`)}>
              Open Application
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => navigate("/admin/accounts")}>
            Back to Accounts
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Customer & Loan</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Customer</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{item.customerName || "-"}</p>
              <p className="mt-1 text-sm text-slate-600">{item.phone || "-"}</p>
              <p className="mt-1 text-sm text-slate-600">{item.email || "-"}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Application</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{item.applicationCode || "-"}</p>
              <p className="mt-1 text-sm text-slate-600">{item.loanProductName || item.loanProductSlug || "-"}</p>
              <div className="mt-2">
                <Badge tone={ACCOUNT_STATUS_TONE[item.status] || "gray"}>{item.status || "ACTIVE"}</Badge>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Approved Amount</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatMoney(item.approvedAmount)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Disbursed Amount</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatMoney(item.disbursedAmount)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Outstanding Balance</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatMoney(item.outstandingBalance)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Next Due Date</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatDateOnly(item.nextDueDate)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-4">
          <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Disbursement</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Approved By</p>
              <p className="mt-1 text-sm text-slate-900">{item.approvedBy || "-"}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDate(item.approvedAt)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Disbursed By</p>
              <p className="mt-1 text-sm text-slate-900">{item.disbursedBy || "-"}</p>
              <p className="mt-1 text-xs text-slate-500">{formatDate(item.disbursedAt)}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Method</p>
                <p className="mt-1 text-sm text-slate-900">{humanizeValue(item.disbursementMethod || "-")}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">System Reference</p>
                <p className="mt-1 text-sm text-slate-900">{item.transactionReference || "-"}</p>
              </div>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Disbursement Note</p>
              <p className="mt-1 text-sm text-slate-700">{item.disbursementNote || "-"}</p>
            </div>
            {item.disbursementMethod === "bank_transfer" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Bank Name</p>
                  <p className="mt-1 text-sm text-slate-900">{item.disbursementBankName || "-"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Account Name</p>
                  <p className="mt-1 text-sm text-slate-900">{item.disbursementAccountName || "-"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 sm:col-span-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Account Number</p>
                  <p className="mt-1 text-sm text-slate-900">{item.disbursementAccountNumber || "-"}</p>
                </div>
              </div>
            ) : null}
            {item.disbursementMethod === "mobile_money" ? (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Provider</p>
                  <p className="mt-1 text-sm text-slate-900">{item.disbursementMobileProvider || "-"}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Mobile Number</p>
                  <p className="mt-1 text-sm text-slate-900">{item.disbursementMobileNumber || "-"}</p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {repaymentPlan ? (
        <div className="rounded-xl border bg-white p-4">
          <button
            type="button"
            onClick={() => setScheduleOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left"
          >
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Repayment Schedule</h2>
              <p className="mt-1 text-xs text-slate-500">
                Outstanding balance and due schedule based on disbursement data.
              </p>
            </div>
            <ChevronDown
              className={[
                "h-4 w-4 text-slate-500 transition-transform duration-200",
                scheduleOpen ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>

          {scheduleOpen ? (
            <div className="mt-4 space-y-4">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Monthly Rate</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{(repaymentPlan.monthlyRate * 100).toFixed(1)}%</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Monthly Installment</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{formatMoney(repaymentPlan.monthlyInstallment)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">First Payment</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{formatMoney(repaymentPlan.firstInstallment)}</p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total Repayment</p>
                  <p className="mt-1 text-sm font-medium text-slate-900">{formatMoney(repaymentPlan.totalRepayment)}</p>
                </div>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-sm">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <th className="px-3 py-3">Month</th>
                      <th className="px-3 py-3">Due Date</th>
                      <th className="px-3 py-3">Opening</th>
                      <th className="px-3 py-3">Principal</th>
                      <th className="px-3 py-3">Interest</th>
                      <th className="px-3 py-3">Fees</th>
                      <th className="px-3 py-3">Installment</th>
                      <th className="px-3 py-3">Closing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {repaymentPlan.schedule.map((row) => (
                      <tr key={row.month}>
                        <td className="px-3 py-3 text-slate-900">{row.month}</td>
                        <td className="px-3 py-3 text-slate-700">{formatDateOnly(row.dueDate)}</td>
                        <td className="px-3 py-3 text-slate-700">{formatMoney(row.openingBalance)}</td>
                        <td className="px-3 py-3 text-slate-700">{formatMoney(row.principalPaid)}</td>
                        <td className="px-3 py-3 text-slate-700">{formatMoney(row.interest)}</td>
                        <td className="px-3 py-3 text-slate-700">{formatMoney(row.fees)}</td>
                        <td className="px-3 py-3 font-medium text-slate-900">{formatMoney(row.installment)}</td>
                        <td className="px-3 py-3 text-slate-700">{formatMoney(row.closingBalance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
