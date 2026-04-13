import { Link } from "react-router-dom";

export default function DashboardRepaymentsPage() {
  // Dummy data (replace with API later)
  const loanActive = true;

  const summary = {
    totalOutstanding: 850000,
    nextDueAmount: 120000,
    nextDueDate: "2026-03-05",
    overdueAmount: 0,
  };

  const installments = [
    {
      no: 1,
      dueDate: "2026-03-05",
      amount: 120000,
      status: "Due",
    },
    {
      no: 2,
      dueDate: "2026-04-05",
      amount: 120000,
      status: "Upcoming",
    },
    {
      no: 0,
      dueDate: "2026-02-05",
      amount: 120000,
      status: "Paid",
    },
  ];

  const recentPayments = [
    {
      date: "2026-02-05",
      amount: 120000,
      method: "Mobile Money",
      reference: "TXN10234",
    },
    {
      date: "2026-01-05",
      amount: 120000,
      method: "Bank Transfer",
      reference: "TXN10111",
    },
  ];

  const getStatusChip = (status) => {
    const base = "px-2 py-1 text-xs font-semibold rounded-full";
    switch (status) {
      case "Paid":
        return `${base} bg-emerald-50 text-emerald-700 border border-emerald-200`;
      case "Due":
        return `${base} bg-amber-50 text-amber-700 border border-amber-200`;
      case "Overdue":
        return `${base} bg-red-50 text-red-700 border border-red-200`;
      default:
        return `${base} bg-slate-100 text-slate-700 border border-slate-200`;
    }
  };

  if (!loanActive) {
    return (
      <div className="space-y-6">
        <section className="rounded-2xl border border-dashed p-10 text-center space-y-4">
          <p className="text-sm text-slate-600">
            No active repayment account.
          </p>
          <Link
            to="/apply"
            className="inline-flex rounded-xl bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-800 transition"
          >
            Apply for a loan
          </Link>
        </section>
      </div>
    );
  }

  const statusBanner =
    summary.overdueAmount > 0
      ? "overdue"
      : "onTrack";

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <section className="space-y-2">
        <h1 className="text-xl font-semibold text-slate-800">
          Repayments
        </h1>
        <p className="text-sm text-slate-500">
          View your repayment schedule and payment history.
        </p>
        <p className="text-xs text-slate-400">
          Amounts shown are based on latest account update.
        </p>
      </section>

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard label="Total Outstanding" value={summary.totalOutstanding} />
        <SummaryCard label="Next Due Amount" value={summary.nextDueAmount} />
        <SummaryCard label="Next Due Date" value={summary.nextDueDate} />
        <SummaryCard
          label="Overdue Amount"
          value={summary.overdueAmount}
          highlight={summary.overdueAmount > 0}
        />
      </div>

      {/* STATUS BANNER */}
      <section
        className={`rounded-2xl border p-4 ${
          summary.overdueAmount > 0
            ? "bg-red-50 border-red-200"
            : "bg-emerald-50 border-emerald-200"
        }`}
      >
        <p className="text-sm font-medium">
          {summary.overdueAmount > 0
            ? "You have overdue payments. Please pay immediately."
            : "You are on track with your repayments."}
        </p>
      </section>

      {/* QUICK ACTIONS */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ActionButton label="Pay Now" />
        <ActionButton label="View Schedule" />
        <ActionButton label="Download Statement" />
        <ActionButton label="Contact Officer" />
      </div>

      {/* INSTALLMENT TABLE (Desktop) */}
      <div className="hidden md:block overflow-x-auto rounded-2xl border bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="p-4 text-left">Installment</th>
              <th className="p-4 text-left">Due Date</th>
              <th className="p-4 text-left">Amount</th>
              <th className="p-4 text-left">Status</th>
              <th className="p-4 text-left">Action</th>
            </tr>
          </thead>
          <tbody>
            {installments.map((item) => (
              <tr key={item.no} className="border-t hover:bg-slate-50">
                <td className="p-4">#{item.no}</td>
                <td className="p-4">{item.dueDate}</td>
                <td className="p-4">MWK {item.amount.toLocaleString("en-US")}</td>
                <td className="p-4">
                  <span className={getStatusChip(item.status)}>
                    {item.status}
                  </span>
                </td>
                <td className="p-4">
                  {item.status === "Paid" ? (
                    <button className="text-slate-700 hover:underline">
                      View Receipt
                    </button>
                  ) : (
                    <button className="text-slate-700 hover:underline">
                      Pay Now
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* MOBILE CARDS */}
      <div className="md:hidden space-y-3">
        {installments.map((item) => (
          <div
            key={item.no}
            className="rounded-2xl border bg-white p-4 shadow-sm space-y-2"
          >
            <div className="flex justify-between items-center">
              <p className="font-semibold">Installment #{item.no}</p>
              <span className={getStatusChip(item.status)}>
                {item.status}
              </span>
            </div>
            <p className="text-sm text-slate-600">
              Due: {item.dueDate}
            </p>
            <p className="text-sm">
              MWK {item.amount.toLocaleString("en-US")}
            </p>
            <button className="w-full rounded-xl border px-4 py-2 text-sm hover:bg-slate-100 transition">
              {item.status === "Paid" ? "View Receipt" : "Pay Now"}
            </button>
          </div>
        ))}
      </div>

      {/* PAYMENT METHODS */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-base font-semibold text-slate-800">
          Payment Methods
        </h3>
        <ul className="text-sm text-slate-600 space-y-1">
          <li>Bank Transfer</li>
          <li>Mobile Money</li>
          <li>Branch Payment</li>
        </ul>
        <p className="text-xs text-slate-500">
          Payments may take 1–2 business days to reflect.
        </p>
      </section>

      {/* RECENT PAYMENTS */}
      <section className="rounded-2xl border bg-white p-6 shadow-sm space-y-3">
        <h3 className="text-base font-semibold text-slate-800">
          Recent Payments
        </h3>
        {recentPayments.map((p, idx) => (
          <div
            key={idx}
            className="flex justify-between text-sm border-t pt-2"
          >
            <div>
              <p>{p.date}</p>
              <p className="text-slate-500">{p.method}</p>
            </div>
            <div className="text-right">
              <p>MWK {p.amount.toLocaleString("en-US")}</p>
              <p className="text-slate-400">{p.reference}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}

function SummaryCard({ label, value, highlight }) {
  return (
    <div
      className={`rounded-2xl border bg-white p-4 text-center shadow-sm ${
        highlight ? "border-red-200" : ""
      }`}
    >
      <p className="text-sm text-slate-500">{label}</p>
      <p className="text-lg font-semibold text-slate-800">
        {typeof value === "number"
          ? `MWK ${value.toLocaleString("en-US")}`
          : value}
      </p>
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
