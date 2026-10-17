import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CalendarDays, Download, RefreshCw } from "lucide-react";
import { api } from "../services/api";

const formatMoney = (amount, currency = "MWK") =>
  `${currency} ${Number(amount || 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-GB", { year: "numeric", month: "short", day: "2-digit" });
};

const monthName = (value, fallback) => {
  if (value) {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  }
  return fallback ? `Installment #${fallback}` : "Installment";
};


const getDisplayStatus = (item) => {
  const normalized = String(item?.paymentStatus || "pending").toLowerCase();
  if (normalized === "paid") return "paid";
  if (normalized === "partial") return "partial";

  const due = new Date(item?.dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (!Number.isNaN(due.getTime())) {
    due.setHours(0, 0, 0, 0);
    if (due.getTime() < today.getTime()) return "overdue";
  }

  return "upcoming";
};

const statusLabel = (status) => {
  const normalized = String(status || "upcoming").toLowerCase();
  if (normalized === "paid") return "Paid";
  if (normalized === "partial") return "Part-paid";
  if (normalized === "overdue") return "Overdue";
  return "Upcoming";
};

const statusChip = (status) => {
  const normalized = String(status || "pending").toLowerCase();
  const base = "px-2.5 py-1 text-xs font-semibold rounded-full border capitalize";
  if (normalized === "paid") return `${base} bg-emerald-50 text-emerald-700 border-emerald-200`;
  if (normalized === "overdue") return `${base} bg-red-50 text-red-700 border-red-200`;
  if (normalized === "partial") return `${base} bg-blue-50 text-blue-700 border-blue-200`;
  return `${base} bg-slate-100 text-slate-700 border-slate-200`;
};

export default function DashboardSchedulePage() {
  const navigate = useNavigate();
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [view, setView] = useState("list");
  const [filter, setFilter] = useState("All");
  const [smsReminder, setSmsReminder] = useState(true);
  const [emailReminder, setEmailReminder] = useState(false);
  const [savingReminder, setSavingReminder] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const selectedAccount = useMemo(
    () => accounts.find((item) => String(item._id) === String(selectedAccountId)) || accounts[0] || null,
    [accounts, selectedAccountId]
  );

  const currency = selectedAccount?.currency || "MWK";
  const rawSchedule = Array.isArray(selectedAccount?.schedule) ? selectedAccount.schedule : [];

  const schedule = useMemo(() => {
    const now = new Date();
    const next3 = new Date();
    next3.setMonth(next3.getMonth() + 3);

    return rawSchedule.filter((item) => {
      if (filter === "All") return true;
      const due = new Date(item.dueDate);
      if (Number.isNaN(due.getTime())) return true;
      if (filter === "This Month") {
        return due.getFullYear() === now.getFullYear() && due.getMonth() === now.getMonth();
      }
      if (filter === "Next 3 Months") {
        return due >= now && due <= next3;
      }
      return true;
    });
  }, [rawSchedule, filter]);

  const nextInstallment = useMemo(
    () => rawSchedule.find((item) => String(item.paymentStatus || "").toLowerCase() !== "paid") || null,
    [rawSchedule]
  );

  const loadAccounts = async () => {
    setLoading(true);
    setError("");
    try {
      const [{ data }, { data: reminderResponse }] = await Promise.all([
        api.get("/accounts/mine"),
        api.get("/profile/me/reminders"),
      ]);
      const items = data?.data?.items || data?.items || [];
      setAccounts(items);
      setSelectedAccountId((prev) => prev || String(items[0]?._id || ""));
      const prefs = reminderResponse?.data || reminderResponse || {};
      setSmsReminder(prefs.sms !== false);
      setEmailReminder(Boolean(prefs.email));
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Unable to load your repayment schedule.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAccounts();
  }, []);

  const saveReminderPreference = async (next) => {
    setSavingReminder(true);
    setError("");
    try {
      await api.patch("/profile/me/reminders", next);
      if (typeof next.sms === "boolean") setSmsReminder(next.sms);
      if (typeof next.email === "boolean") setEmailReminder(next.email);
      setNotice("Reminder preference saved to your account.");
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Could not save reminder preference.");
    } finally {
      setSavingReminder(false);
    }
  };

  const openRepayment = (item = null) => {
    navigate("/dashboard/repayments", {
      state: {
        accountId: selectedAccount?._id,
        repaymentMonth: item?.month || nextInstallment?.month || null,
        source: "schedule",
      },
    });
  };

  const printSchedule = () => {
    if (!selectedAccount) return;
    const rows = rawSchedule
      .map(
        (item) => `<tr><td>#${item.month || "-"}</td><td>${formatDate(item.dueDate)}</td><td>${formatMoney(item.installment, currency)}</td><td>${formatMoney(item.paidAmount, currency)}</td><td>${formatMoney(item.remainingAmount, currency)}</td><td>${item.paymentStatus || "pending"}</td></tr>`
      )
      .join("");
    const printable = window.open("", "_blank", "width=900,height=700");
    if (!printable) {
      setError("Please allow pop-ups to download or print your repayment schedule.");
      return;
    }
    printable.document.write(`<!doctype html><html><head><title>Repayment Schedule</title><style>body{font-family:Arial,sans-serif;padding:24px;color:#0f172a}h1{font-size:22px}table{border-collapse:collapse;width:100%;margin-top:16px}td,th{border:1px solid #d8dee9;padding:8px;text-align:left;font-size:12px}.muted{color:#64748b}</style></head><body><h1>Alinafe Capital Repayment Schedule</h1><p class="muted">${selectedAccount.accountNumber || "Loan account"}</p><table><thead><tr><th>Installment</th><th>Due Date</th><th>Amount</th><th>Paid</th><th>Remaining</th><th>Status</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=()=>{window.print();}</script></body></html>`);
    printable.document.close();
  };

  const remainingItems = rawSchedule.filter((item) => String(item.paymentStatus || "").toLowerCase() !== "paid");
  const overdueItems = remainingItems.filter((item) => getDisplayStatus(item) === "overdue");
  const summary = {
    nextDate: nextInstallment?.dueDate || selectedAccount?.nextDueDate,
    nextAmount: nextInstallment?.remainingAmount || 0,
    remaining: remainingItems.length,
    overdue: overdueItems.length,
    endDate: rawSchedule[rawSchedule.length - 1]?.dueDate,
  };

  if (loading) {
    return (
      <div className="rounded-2xl border bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-900" />
        <p className="text-sm text-slate-600">Loading your repayment schedule...</p>
      </div>
    );
  }

  if (!selectedAccount) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-dashed bg-white p-10 text-center shadow-sm space-y-4">
          <p className="text-sm text-slate-600">No repayment schedule is available yet.</p>
          <p className="text-xs text-slate-500">Your schedule will appear here after your loan has been approved and disbursed.</p>
          <Link to="/dashboard/apply-loan" className="inline-flex rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800">Apply for a loan</Link>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      <section className="space-y-2">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-semibold text-slate-900">Repayment Schedule</h1>
            <p className="text-sm text-slate-500">Review upcoming installment dates and open repayment when you are ready to pay.</p>
          </div>
          <button type="button" onClick={loadAccounts} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"><RefreshCw size={15} /> Refresh</button>
        </div>
      </section>

      {error ? <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {notice ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}

      {accounts.length > 1 ? (
        <section className="rounded-2xl border bg-white p-4 shadow-sm">
          <label className="text-sm font-semibold text-slate-700">
            Select loan account
            <select value={selectedAccountId} onChange={(e) => setSelectedAccountId(e.target.value)} className="mt-2 h-12 w-full rounded-xl border px-3 text-sm outline-none focus:border-slate-900">
              {accounts.map((account) => <option key={account._id} value={account._id}>{account.accountNumber} - {account.loanProductName || "Loan"}</option>)}
            </select>
          </label>
        </section>
      ) : null}

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard label={summary.overdue ? "Oldest Unpaid Date" : "Next Payment Date"} value={formatDate(summary.nextDate)} />
        <SummaryCard label="Next Amount" value={formatMoney(summary.nextAmount, currency)} />
        <SummaryCard label="Remaining Installments" value={summary.remaining} />
        <SummaryCard label={summary.overdue ? "Overdue Installments" : "Loan End Date"} value={summary.overdue || formatDate(summary.endDate)} />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setView("list")} className={`rounded-full border px-3 py-1.5 text-sm ${view === "list" ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-100"}`}>List View</button>
          <button onClick={() => setView("calendar")} className={`rounded-full border px-3 py-1.5 text-sm ${view === "calendar" ? "bg-slate-900 text-white" : "bg-white hover:bg-slate-100"}`}>Calendar View</button>
        </div>
        <select value={filter} onChange={(e) => setFilter(e.target.value)} className="rounded-xl border px-3 py-2 text-sm">
          <option>This Month</option>
          <option>Next 3 Months</option>
          <option>All</option>
        </select>
      </div>

      {view === "list" ? (
        <div className="space-y-4">
          {schedule.length ? schedule.map((item) => {
            const displayStatus = getDisplayStatus(item);
            const penalty = Number(item.penaltyAmount || 0);
            const cardTone = displayStatus === "overdue"
              ? "border-rose-200 bg-gradient-to-r from-rose-50/80 to-white"
              : displayStatus === "paid"
              ? "border-emerald-200 bg-gradient-to-r from-emerald-50/60 to-white"
              : "border-slate-200 bg-white";
            return (
            <div key={`${selectedAccount._id}-${item.month}`} className={`overflow-hidden rounded-2xl border p-5 shadow-sm ${cardTone}`}>
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-base font-semibold text-slate-900">Installment #{item.month}</p>
                    <span className={statusChip(displayStatus)}>{statusLabel(displayStatus)}</span>
                  </div>
                  <p className="mt-1 text-sm text-slate-500">{monthName(item.dueDate, item.month)} · Due {formatDate(item.dueDate)}</p>
                </div>
                <div className="text-left lg:text-right">
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Amount Remaining</p>
                  <p className={`mt-1 text-xl font-bold ${displayStatus === "overdue" ? "text-rose-700" : "text-[#002D5B]"}`}>{formatMoney(item.remainingAmount ?? item.installment, currency)}</p>
                </div>
              </div>

              <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
                <ScheduleMetric label="Principal" value={formatMoney(item.principalPaid, currency)} />
                <ScheduleMetric label="Interest" value={formatMoney(item.interest, currency)} />
                <ScheduleMetric label="Fees" value={formatMoney(item.fees, currency)} />
                <ScheduleMetric label="Paid" value={formatMoney(item.paidAmount, currency)} />
                <ScheduleMetric label="Scheduled Amount" value={formatMoney(item.baseInstallment || item.installment, currency)} />
              </div>

              {penalty > 0 ? (
                <div className="mt-4 flex flex-col gap-1 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between">
                  <span><strong>Overdue penalty:</strong> {Number(item.penaltyRatePercent || 15).toFixed(0)}% applied because the installment was not cleared by the due date.</span>
                  <strong className="shrink-0">+ {formatMoney(penalty, currency)}</strong>
                </div>
              ) : null}

              <button onClick={() => openRepayment(item)} className="mt-4 w-full rounded-xl border border-[#002D5B]/15 bg-white px-4 py-2.5 text-sm font-semibold text-[#002D5B] transition hover:bg-blue-50">
                {displayStatus === "paid" ? "View repayment details" : displayStatus === "overdue" ? "Pay overdue installment" : "Make payment"}
              </button>
            </div>
            );
          }) : <div className="rounded-2xl border bg-white p-8 text-center text-sm text-slate-500">No installments match this filter.</div>}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {schedule.map((item) => {
            const displayStatus = getDisplayStatus(item);
            return (
            <button key={`${selectedAccount._id}-${item.month}-calendar`} type="button" onClick={() => openRepayment(item)} className="rounded-2xl border bg-white p-4 text-left shadow-sm hover:border-slate-400">
              <CalendarDays size={18} className="text-slate-500" />
              <p className="mt-3 font-semibold text-slate-900">{monthName(item.dueDate, item.month)}</p>
              <p className="mt-1 text-sm text-slate-500">{formatDate(item.dueDate)}</p>
              <p className="mt-2 text-sm font-semibold">{formatMoney(item.remainingAmount ?? item.installment, currency)}</p>
              {Number(item.penaltyAmount || 0) > 0 ? <p className="mt-1 text-xs font-semibold text-rose-700">Includes {formatMoney(item.penaltyAmount, currency)} penalty</p> : null}
              <span className={`mt-3 inline-flex ${statusChip(displayStatus)}`}>{statusLabel(displayStatus)}</span>
            </button>
            );
          })}
        </div>
      )}

      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-base font-semibold text-slate-800">Reminders</h3>
        <div className="flex items-center justify-between text-sm">
          <span>SMS reminders</span>
          <input type="checkbox" disabled={savingReminder} checked={smsReminder} onChange={() => saveReminderPreference({ sms: !smsReminder })} />
        </div>
        <div className="flex items-center justify-between text-sm">
          <span>Email reminders</span>
          <input type="checkbox" disabled={savingReminder} checked={emailReminder} onChange={() => saveReminderPreference({ email: !emailReminder })} />
        </div>
        <p className="text-xs text-slate-500">Your preference is saved to your account. Reminder services can use the controlled 7-day, 3-day, due-date and overdue schedule when enabled.</p>
      </section>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <ActionButton label="Pay Next Installment" onClick={() => openRepayment(nextInstallment)} />
        <LinkButton to="/dashboard/repayments" label="Open Repayments" />
        <ActionButton label="Download Schedule PDF" icon={Download} onClick={printSchedule} />
      </div>
    </div>
  );
}

function ScheduleMetric({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white/80 px-3 py-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border bg-white p-4 text-center shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="mt-2 text-base font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function ActionButton({ label, onClick, icon: Icon }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center justify-center gap-2 rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100 transition">
      {Icon ? <Icon size={15} /> : null}
      {label}
    </button>
  );
}

function LinkButton({ to, label }) {
  return (
    <Link to={to} className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold hover:bg-slate-100 transition text-center">
      {label}
    </Link>
  );
}
