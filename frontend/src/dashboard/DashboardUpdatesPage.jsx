import { useState } from "react";
import { Link } from "react-router-dom";

const FILTERS = ["All", "KYC", "Applications", "Repayments", "System"];

export default function DashboardUpdatesPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [updates, setUpdates] = useState([
    {
      id: 1,
      type: "KYC",
      title: "KYC Under Review",
      message: "Your documents are being verified by our team.",
      time: "2h ago",
      unread: true,
      priority: "normal",
      cta: "/dashboard/kyc-status",
      ctaLabel: "View KYC",
    },
    {
      id: 2,
      type: "Repayments",
      title: "Upcoming Repayment Due",
      message: "Your installment is due in 3 days.",
      time: "5h ago",
      unread: true,
      priority: "high",
      cta: "/dashboard/repayments",
      ctaLabel: "View Payment",
    },
    {
      id: 3,
      type: "System",
      title: "Welcome to Alinafe Capital",
      message: "Your account has been successfully created.",
      time: "1d ago",
      unread: false,
      priority: "normal",
      cta: "/dashboard",
      ctaLabel: "Open Dashboard",
    },
  ]);

  const unreadCount = updates.filter((u) => u.unread).length;
  const todayCount = updates.filter((u) => u.time.includes("h")).length;

  const filteredUpdates =
    activeFilter === "All"
      ? updates
      : updates.filter((u) => u.type === activeFilter);

  const markAllAsRead = () => {
    setUpdates((prev) =>
      prev.map((u) => ({
        ...u,
        unread: false,
      }))
    );
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <section className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-800">Updates</h1>
          <p className="text-sm text-slate-500">
            Stay informed about your account activity.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
            Unread: {unreadCount}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">
            Today: {todayCount}
          </span>
          <button
            onClick={markAllAsRead}
            className="text-xs text-slate-600 hover:underline"
          >
            Mark all as read
          </button>
        </div>
      </section>

      {/* FILTER TABS */}
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1.5 text-sm rounded-full border transition ${
              activeFilter === filter
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-700 hover:bg-slate-100"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* UPDATES LIST */}
      <div className="space-y-3">
        {filteredUpdates.length > 0 ? (
          filteredUpdates
            .slice()
            .reverse()
            .map((update) => (
              <div
                key={update.id}
                className={`rounded-2xl border p-5 space-y-3 hover:shadow-sm transition ${
                  update.priority === "high"
                    ? "border-l-4 border-l-amber-500"
                    : ""
                } ${
                  update.unread
                    ? "bg-slate-50 border-slate-300"
                    : "bg-white"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold bg-slate-100 px-2 py-1 rounded">
                        {update.type}
                      </span>

                      {update.unread && (
                        <span className="h-2 w-2 rounded-full bg-slate-900" />
                      )}
                    </div>

                    <h3 className="text-base font-semibold text-slate-800">
                      {update.title}
                    </h3>

                    <p className="text-sm text-slate-600">
                      {update.message}
                    </p>
                  </div>

                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {update.time}
                  </span>
                </div>

                <div className="pt-2">
                  <Link
                    to={update.cta}
                    className="w-full sm:w-auto inline-flex justify-center sm:justify-start rounded-xl border px-4 py-2 text-sm hover:bg-slate-100 transition"
                  >
                    {update.ctaLabel}
                  </Link>
                </div>
              </div>
            ))
        ) : (
          /* EMPTY STATE */
          <div className="rounded-2xl border border-dashed p-10 text-center space-y-4">
            <div className="text-4xl">📭</div>
            <p className="text-sm text-slate-600">
              No updates available right now.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex rounded-xl border px-4 py-2 text-sm hover:bg-slate-100 transition"
            >
              Go to Dashboard
            </Link>
          </div>
        )}
      </div>

      {/* SUPPORT ROW */}
      <section className="pt-6 border-t flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <p className="text-sm text-slate-600">
          Need help understanding an update?
        </p>

        <div className="flex gap-4 text-sm">
          <Link to="/contact-officer" className="hover:underline">
            Contact Officer
          </Link>
          <Link to="/help-center" className="hover:underline">
            Help Center
          </Link>
        </div>
      </section>

    </div>
  );
}