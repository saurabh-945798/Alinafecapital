import { Fragment, useEffect, useMemo, useState } from "react";
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
  return Number.isFinite(amount) ? `MWK ${amount.toLocaleString("en-US")}` : "-";
};

const humanizeValue = (value = "") => {
  const normalized = String(value || "").trim();
  if (!normalized) return "-";
  return normalized.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
};

const roundAmount = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? Math.round(amount * 1000) / 1000 : 0;
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
  const processingFee = roundAmount(principal * Number(account?.processingFeeRate || 0));
  const adminFee = roundAmount(principal * Number(account?.adminFeeRate || 0));
  const startDate = account?.disbursedAt || account?.approvedAt || account?.createdAt || new Date().toISOString();

  let balance = roundAmount(principal);
  const schedule = [];

  for (let month = 1; month <= months; month += 1) {
    const openingBalance = balance;
    const interest = roundAmount(openingBalance * monthlyRate);
    const principalPaid = roundAmount(Math.max(0, installment - interest));
    balance = roundAmount(Math.max(0, openingBalance - principalPaid));
    const fees = month === 1 ? roundAmount(processingFee + adminFee) : 0;

    schedule.push({
      month,
      dueDate: addMonths(startDate, month),
      openingBalance: roundAmount(openingBalance),
      principalPaid: roundAmount(principalPaid),
      interest: roundAmount(interest),
      fees,
      installment: roundAmount(installment + fees),
      closingBalance: roundAmount(balance),
    });
  }

  const totalInterest = roundAmount(schedule.reduce((sum, row) => sum + row.interest, 0));
  return {
    monthlyRate,
    monthlyInstallment: roundAmount(installment),
    firstInstallment: roundAmount(schedule[0]?.installment || installment),
    processingFee,
    adminFee,
    totalInterest,
    totalRepayment: roundAmount(principal + totalInterest + processingFee + adminFee),
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
  const [paymentHistoryOpen, setPaymentHistoryOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(true);
  const [paymentSaving, setPaymentSaving] = useState(false);
  const [activePaymentMonth, setActivePaymentMonth] = useState(null);
  const [editingPaymentId, setEditingPaymentId] = useState("");
  const [deletingPaymentId, setDeletingPaymentId] = useState("");
  const [confirmDeletePaymentId, setConfirmDeletePaymentId] = useState("");
  const [paymentForm, setPaymentForm] = useState({
    month: null,
    paymentDate: new Date().toISOString().slice(0, 10),
    amount: "",
    method: "cash",
    reference: "",
    note: "",
  });

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

  useEffect(() => {
    loadDetail();
  }, [id, toast]);

  const repaymentPlan = useMemo(() => {
    if (!item) return null;
    if (Array.isArray(item.schedule) && item.schedule.length) return item;
    return buildRepaymentPlan(item);
  }, [item]);

  const paymentAlert = useMemo(() => {
    if (!item) return null;
    if (Number(item.outstandingBalance || 0) <= 0) {
      return {
        tone: "border-emerald-200 bg-emerald-50 text-emerald-900",
        title: "Loan Settled",
        message: "This account is fully paid. No further repayment action is required.",
      };
    }
    if (Number(item.overdueInstallmentsCount || 0) > 0) {
      return {
        tone: "border-rose-200 bg-rose-50 text-rose-900",
        title: "Payment Attention Needed",
        message: `${item.overdueInstallmentsCount} installment(s) are overdue. Review the repayment schedule and update the missing payment entries.`,
      };
    }
    if (item.nextDueDate) {
      return {
        tone: "border-amber-200 bg-amber-50 text-amber-900",
        title: "Next Payment Due",
        message: `The next repayment is due on ${formatDateOnly(item.nextDueDate)}. Outstanding balance is ${formatMoney(item.outstandingBalance)}.`,
      };
    }
    return {
      tone: "border-slate-200 bg-slate-50 text-slate-900",
      title: "Payment Tracking Active",
      message: "Repayment tracking is active for this account. Record payments against each installment row.",
    };
  }, [item]);

  const openPaymentRow = (row) => {
    setActivePaymentMonth(row.month);
    setPaymentForm({
      month: row.month,
      paymentDate: new Date().toISOString().slice(0, 10),
      amount: String(
        Math.max(0, Number(row.remainingAmount || row.installment || 0)).toFixed(2)
      ),
      method: "cash",
      reference: "",
      note: "",
    });
  };

  const openPaymentEdit = (entry) => {
    setEditingPaymentId(entry._id || "");
    setPaymentForm({
      month: null,
      paymentDate: entry?.paymentDate
        ? new Date(entry.paymentDate).toISOString().slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      amount: String(Number(entry?.amount || 0)),
      method: entry?.method || "cash",
      reference: entry?.reference || "",
      note: entry?.note || "",
    });
  };

  const closePaymentEdit = () => {
    setEditingPaymentId("");
    setPaymentForm({
      month: null,
      paymentDate: new Date().toISOString().slice(0, 10),
      amount: "",
      method: "cash",
      reference: "",
      note: "",
    });
  };

  const closePaymentRow = () => {
    setActivePaymentMonth(null);
    setPaymentForm({
      month: null,
      paymentDate: new Date().toISOString().slice(0, 10),
      amount: "",
      method: "cash",
      reference: "",
      note: "",
    });
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    setError("");

    if (!String(paymentForm.paymentDate || "").trim()) {
      setError("Payment date is required.");
      return;
    }
    if (!Number(paymentForm.amount || 0)) {
      setError("Payment amount is required.");
      return;
    }

    setPaymentSaving(true);
    try {
      const payload = {
        paymentDate: paymentForm.paymentDate,
        amount: Number(paymentForm.amount),
        method: paymentForm.method,
        reference: paymentForm.reference,
        note:
          paymentForm.note ||
          (paymentForm.month ? `Recorded against installment ${paymentForm.month}` : ""),
      };

      const updated = editingPaymentId
        ? await accountsApi.updatePayment(id, editingPaymentId, payload)
        : await accountsApi.addPayment(id, payload);

      setItem(updated || null);
      closePaymentEdit();
      closePaymentRow();
      toast.success(editingPaymentId ? "Payment entry updated." : "Payment entry saved.");
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to save payment entry.";
      setError(msg);
      toast.error(msg);
    } finally {
      setPaymentSaving(false);
    }
  };

  const deletePayment = async (paymentId) => {
    setError("");
    setDeletingPaymentId(paymentId);
    try {
      const updated = await accountsApi.deletePayment(id, paymentId);
      setItem(updated || null);
      if (editingPaymentId === paymentId) {
        closePaymentEdit();
      }
      setConfirmDeletePaymentId("");
      toast.success("Payment entry deleted.");
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to delete payment entry.";
      setError(msg);
      toast.error(msg);
    } finally {
      setDeletingPaymentId("");
    }
  };

  if (loading) {
    return <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">Loading payment details...</div>;
  }

  if (!item) {
    return <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">Payment account not found.</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">Payment Detail</p>
          <h1 className="mt-2 text-2xl font-bold text-slate-900">{item.accountNumber}</h1>
          <p className="mt-1 text-sm text-slate-500">
            Post-disbursement payment view for repayment schedule, dues, and outstanding balance.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {item.inquiryId ? (
            <Button variant="outline" onClick={() => navigate(`/admin/applications/${item.inquiryId}`)}>
              Open Application
            </Button>
          ) : null}
          <Button variant="outline" onClick={() => navigate("/admin/payments")}>
            Back to Payments
          </Button>
        </div>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      {paymentAlert ? (
        <div className={`rounded-xl border px-4 py-3 ${paymentAlert.tone}`}>
          <p className="text-sm font-semibold">{paymentAlert.title}</p>
          <p className="mt-1 text-sm">{paymentAlert.message}</p>
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
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Total Paid</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{formatMoney(item.totalPaidAmount)}</p>
            </div>
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">EMIs Summary</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {item.paidInstallmentsCount || 0} Paid / {item.pendingInstallmentsCount || 0} Pending
              </p>
              <p className="mt-1 text-xs text-rose-600">
                {item.overdueInstallmentsCount || 0} Overdue
              </p>
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

      <div className="rounded-xl border bg-white p-4">
          <button
            type="button"
            onClick={() => setPaymentHistoryOpen((prev) => !prev)}
            className="flex w-full items-center justify-between gap-3 rounded-lg px-1 py-1 text-left"
          >
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">Payment History</h2>
              <p className="mt-1 text-sm text-slate-500">
                Manual entries recorded by admin after disbursement.
              </p>
            </div>
            <ChevronDown
              className={[
                "h-4 w-4 text-slate-500 transition-transform duration-200",
                paymentHistoryOpen ? "rotate-180" : "",
              ].join(" ")}
            />
          </button>

          {paymentHistoryOpen ? (
          Array.isArray(item.repaymentEntries) && item.repaymentEntries.length ? (
            <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
              <table className="min-w-full divide-y divide-slate-200 text-sm">
                <thead className="bg-slate-50">
                  <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                    <th className="px-3 py-3">Date</th>
                    <th className="px-3 py-3">Amount</th>
                    <th className="px-3 py-3">Method</th>
                    <th className="px-3 py-3">Reference</th>
                    <th className="px-3 py-3">Note</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {[...item.repaymentEntries]
                    .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
                    .map((entry) => (
                      <Fragment key={entry._id || `${entry.paymentDate}-${entry.amount}`}>
                      <tr>
                        <td className="px-3 py-3 text-slate-700">{formatDateOnly(entry.paymentDate)}</td>
                        <td className="px-3 py-3 font-medium text-slate-900">{formatMoney(entry.amount)}</td>
                        <td className="px-3 py-3 text-slate-700">{humanizeValue(entry.method)}</td>
                        <td className="px-3 py-3 text-slate-700">{entry.reference || "-"}</td>
                        <td className="px-3 py-3 text-slate-700">{entry.note || "-"}</td>
                        <td className="px-3 py-3">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openPaymentEdit(entry)}>
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              disabled={deletingPaymentId === entry._id}
                              onClick={() => setConfirmDeletePaymentId(entry._id)}
                            >
                              {deletingPaymentId === entry._id ? "Deleting..." : "Delete"}
                            </Button>
                          </div>
                        </td>
                      </tr>
                      {editingPaymentId === entry._id ? (
                        <tr className="bg-slate-50/70">
                          <td className="px-3 py-4" colSpan={6}>
                            <form
                              className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_1.2fr_auto] lg:items-end"
                              onSubmit={submitPayment}
                            >
                              <label className="space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment Date</span>
                                <input
                                  type="date"
                                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                                  value={paymentForm.paymentDate}
                                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</span>
                                <input
                                  type="number"
                                  min="0"
                                  step="any"
                                  inputMode="decimal"
                                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                                  value={paymentForm.amount}
                                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Method</span>
                                <select
                                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                                  value={paymentForm.method}
                                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value }))}
                                >
                                  <option value="cash">Cash</option>
                                  <option value="bank_transfer">Bank Transfer</option>
                                  <option value="mobile_money">Mobile Money</option>
                                </select>
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reference</span>
                                <input
                                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                                  value={paymentForm.reference}
                                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))}
                                />
                              </label>
                              <label className="space-y-1">
                                <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Note</span>
                                <input
                                  className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                                  value={paymentForm.note}
                                  onChange={(e) => setPaymentForm((prev) => ({ ...prev, note: e.target.value }))}
                                />
                              </label>
                              <div className="flex gap-2">
                                <Button type="submit" disabled={paymentSaving}>
                                  {paymentSaving ? "Saving..." : "Save"}
                                </Button>
                                <Button type="button" variant="outline" onClick={closePaymentEdit}>
                                  Cancel
                                </Button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      ) : null}
                      </Fragment>
                    ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-4 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
              No payment entries recorded yet.
            </div>
          )
          ) : null}
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
                      <th className="px-3 py-3">Paid</th>
                      <th className="px-3 py-3">Balance Due</th>
                      <th className="px-3 py-3">Status</th>
                      <th className="px-3 py-3">Action</th>
                      <th className="px-3 py-3">Closing</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {repaymentPlan.schedule.map((row) => (
                      <Fragment key={row.month}>
                        <tr
                          className={[
                            "transition-colors",
                            row.paymentStatus === "paid"
                              ? "bg-emerald-50/70"
                              : row.paymentStatus === "partial"
                                ? "bg-amber-50/70"
                                : row.paymentStatus === "overdue"
                                  ? "bg-rose-50/70"
                                  : "bg-white",
                          ].join(" ")}
                        >
                          <td className="px-3 py-3 text-slate-900">{row.month}</td>
                          <td className="px-3 py-3 text-slate-700">{formatDateOnly(row.dueDate)}</td>
                          <td className="px-3 py-3 text-slate-700">{formatMoney(row.openingBalance)}</td>
                          <td className="px-3 py-3 text-slate-700">{formatMoney(row.principalPaid)}</td>
                          <td className="px-3 py-3 text-slate-700">{formatMoney(row.interest)}</td>
                          <td className="px-3 py-3 text-slate-700">{formatMoney(row.fees)}</td>
                          <td className="px-3 py-3 font-medium text-slate-900">{formatMoney(row.installment)}</td>
                          <td className="px-3 py-3 text-slate-700">{formatMoney(row.paidAmount)}</td>
                          <td className="px-3 py-3 text-slate-700">{formatMoney(row.remainingAmount)}</td>
                          <td className="px-3 py-3">
                            <Badge
                              tone={
                                row.paymentStatus === "paid"
                                  ? "green"
                                  : row.paymentStatus === "partial"
                                    ? "amber"
                                    : row.paymentStatus === "overdue"
                                      ? "red"
                                      : "gray"
                              }
                            >
                              {humanizeValue(row.paymentStatus)}
                            </Badge>
                          </td>
                          <td className="px-3 py-3 text-center align-middle">
                            {row.paymentStatus !== "paid" ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="min-w-[128px] justify-center"
                                onClick={() =>
                                  activePaymentMonth === row.month
                                    ? closePaymentRow()
                                    : openPaymentRow(row)
                                }
                              >
                                {activePaymentMonth === row.month ? "Cancel" : "Record Payment"}
                              </Button>
                            ) : (
                              <span className="inline-flex min-w-[128px] items-center justify-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                                Completed
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-slate-700">{formatMoney(row.closingBalance)}</td>
                        </tr>
                        {activePaymentMonth === row.month ? (
                          <tr className="bg-slate-50/70">
                            <td className="px-3 py-4" colSpan={12}>
                              <form className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_1fr_1.2fr_auto] lg:items-end" onSubmit={submitPayment}>
                                <label className="space-y-1">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Payment Date</span>
                                  <input
                                    type="date"
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                                    value={paymentForm.paymentDate}
                                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Amount</span>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    inputMode="decimal"
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                                    value={paymentForm.amount}
                                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, amount: e.target.value }))}
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Method</span>
                                  <select
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                                    value={paymentForm.method}
                                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, method: e.target.value }))}
                                  >
                                    <option value="cash">Cash</option>
                                    <option value="bank_transfer">Bank Transfer</option>
                                    <option value="mobile_money">Mobile Money</option>
                                  </select>
                                </label>
                                <label className="space-y-1">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Reference</span>
                                  <input
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                                    placeholder="Optional"
                                    value={paymentForm.reference}
                                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, reference: e.target.value }))}
                                  />
                                </label>
                                <label className="space-y-1">
                                  <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Note</span>
                                  <input
                                    className="h-10 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm"
                                    placeholder={`Installment ${row.month}`}
                                    value={paymentForm.note}
                                    onChange={(e) => setPaymentForm((prev) => ({ ...prev, note: e.target.value }))}
                                  />
                                </label>
                                <div className="flex gap-2">
                                  <Button type="submit" disabled={paymentSaving}>
                                    {paymentSaving ? "Saving..." : "Save"}
                                  </Button>
                                  <Button type="button" variant="outline" onClick={closePaymentRow}>
                                    Cancel
                                  </Button>
                                </div>
                              </form>
                            </td>
                          </tr>
                        ) : null}
                      </Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {confirmDeletePaymentId ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 px-4">
          <div className="w-full max-w-md rounded-2xl border border-rose-200 bg-white p-6 shadow-2xl">
            <h3 className="text-lg font-semibold text-slate-900">Delete Payment Entry</h3>
            <p className="mt-2 text-sm text-slate-600">
              This will remove the selected payment entry and recalculate the repayment summary for this account.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <Button variant="outline" onClick={() => setConfirmDeletePaymentId("")}>
                Cancel
              </Button>
              <Button
                variant="danger"
                disabled={deletingPaymentId === confirmDeletePaymentId}
                onClick={() => deletePayment(confirmDeletePaymentId)}
              >
                {deletingPaymentId === confirmDeletePaymentId ? "Deleting..." : "Delete Entry"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
