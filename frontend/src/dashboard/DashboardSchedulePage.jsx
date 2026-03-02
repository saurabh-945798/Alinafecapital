import { useState } from "react";
import { Link } from "react-router-dom";

export default function DashboardSchedulePage() {
  const [view, setView] = useState("list");
  const [filter, setFilter] = useState("All");
  const [smsReminder, setSmsReminder] = useState(true);
  const [emailReminder, setEmailReminder] = useState(false);

  // Dummy data (replace with API later)
  const schedule = [
    {
      id: 1,
      month: "March 2026",
      date: "2026-03-05",
      amount: 120000,
      status: "Upcoming",
    },
    {
      id: 2,
      month: "April 2026",
      date: "2026-04-05",
      amount: 120000,
      status: "Upcoming",
    },
  ];

  if (schedule.length === 0) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-dashed p-10 text-center space-y-4">
          <p className="text-sm text-slate-600">
            No repayment schedule available yet.
          </p>
        </section>
      </div>
    );
  }

  const summary = {
    nextDate: schedule[0].date,
    nextAmount: schedule[0].amount,
    remaining: schedule.length,
    endDate: schedule[schedule.length - 1].date,
  };

  const getStatusChip = (status) => {
    const base = "px-2 py-1 text-xs font-semibold rounded-full";
    switch (status) {
      case "Paid":
        return `${base} bg-emerald-50 text-emerald-700 border border-emerald-200`;
      case "Due Today":
        return `${base} bg-amber-50 text-amber-700 border border-amber-200`;
      case "Overdue":
        return `${base} bg-red-50 text-red-700 border border-red-200`;
      default:
        return `${base} bg-slate-100 text-slate-700 border border-slate-200`;
    }
  };

  return (
    <div className="space-y-6">

      {/* HEADER SUMMARY */}
      <section className="space-y-2">
        <h1 className="text-xl font-semibold text-slate-800">
          Repayment Schedule
        </h1>
        <p className="text-sm text-slate-500">
          Check upcoming installment dates and repayment calendar.
        </p>
        <p className="text-xs text-slate-400">
          Schedule updates after each confirmed payment.
        </p>
      </section>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Next Payment Date" value={summary.nextDate} />
        <SummaryCard
          label="Next Amount"
          value={`MWK ${summary.nextAmount.toLocaleString()}`}
        />
        <SummaryCard label="Remaining Installments" value={summary.remaining} />
        <SummaryCard label="Loan End Date" value={summary.endDate} />
      </div>

      {/* VIEW TOGGLE + FILTER */}
      <div className="flex flex-col md:flex-row justify-between gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 text-sm rounded-full border ${
              view === "list"
                ? "bg-slate-900 text-white"
                : "bg-white hover:bg-slate-100"
            }`}
          >
            List View
          </button>
          <button
            onClick={() => setView("calendar")}
            className={`px-3 py-1.5 text-sm rounded-full border ${
              view === "calendar"
                ? "bg-slate-900 text-white"
                : "bg-white hover:bg-slate-100"
            }`}
          >
            Calendar View
          </button>
        </div>

        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="border rounded-xl px-3 py-2 text-sm"
        >
          <option>This Month</option>
          <option>Next 3 Months</option>
          <option>All</option>
        </select>
      </div>

      {/* LIST VIEW */}
      {view === "list" && (
        <div className="space-y-6">
          {schedule.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border bg-white p-5 shadow-sm space-y-3"
            >
              <div className="flex justify-between items-center">
                <p className="font-semibold">{item.month}</p>
                <span className={getStatusChip(item.status)}>
                  {item.status}
                </span>
              </div>

              <p className="text-sm text-slate-600">
                Due Date: {item.date}
              </p>

              <p className="text-sm">
                Amount: MWK {item.amount.toLocaleString()}
              </p>

              <button className="w-full rounded-xl border px-4 py-2 text-sm hover:bg-slate-100 transition">
                {item.status === "Paid" ? "View Receipt" : "Pay"}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* CALENDAR VIEW (Simple Placeholder for Now) */}
      {view === "calendar" && (
        <div className="rounded-2xl border bg-white p-6 text-center text-sm text-slate-500">
          Calendar view coming soon.
        </div>
      )}

      {/* REMINDER CONTROLS */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-base font-semibold text-slate-800">
          Reminders
        </h3>

        <div className="flex items-center justify-between text-sm">
          <span>SMS reminders</span>
          <input
            type="checkbox"
            checked={smsReminder}
            onChange={() => setSmsReminder(!smsReminder)}
          />
        </div>

        <div className="flex items-center justify-between text-sm">
          <span>Email reminders</span>
          <input
            type="checkbox"
            checked={emailReminder}
            onChange={() => setEmailReminder(!emailReminder)}
          />
        </div>

        <p className="text-xs text-slate-500">
          You will receive reminders before due date.
        </p>
      </section>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ActionButton label="Pay Next Installment" />
        <LinkButton to="/dashboard/repayments" label="Open Repayments" />
        <ActionButton label="Download Schedule PDF" />
      </div>

    </div>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="rounded-2xl border bg-white p-4 text-center shadow-sm">
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-base font-semibold text-slate-800">{value}</p>
    </div>
  );
}

function ActionButton({ label }) {
  return (
    <button className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-100 transition">
      {label}
    </button>
  );
}

function LinkButton({ to, label }) {
  return (
    <Link
      to={to}
      className="rounded-xl border px-4 py-2 text-sm hover:bg-slate-100 transition text-center"
    >
      {label}
    </Link>
  );
}