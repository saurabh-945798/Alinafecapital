import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { accountsApi } from "../../services/api/accounts.api";
import { formatMWK, formatMWKCompact } from "../../utils/money.js";
import { useToast } from "../../context/ToastContext.jsx";

const STATUS_TONE = {
  ACTIVE: "green",
  OVERDUE: "red",
  SETTLED: "blue",
  CLOSED: "gray",
};

const STATUS_OPTIONS = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "SETTLED", label: "Settled" },
];

const formatMoney = (value) => formatMWK(value, 3);

const formatMoneyCompactValue = (value) => formatMWKCompact(value, 1);

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

const toDateValue = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const ymKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

export default function ReportsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [allAccounts, setAllAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [csvLoading, setCsvLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [quickRange, setQuickRange] = useState("ALL");
  const [loanProduct, setLoanProduct] = useState("ALL");
  const [status, setStatus] = useState("ALL");
  const [monthlyGapFilter, setMonthlyGapFilter] = useState("ALL");
  const [monthlySort, setMonthlySort] = useState("NEWEST");

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const first = await accountsApi.list({ page: 1, limit: 100, status: "ALL" });
        const firstItems = Array.isArray(first?.items) ? first.items : [];
        const totalPages = Number(first?.pagination?.totalPages || 1);

        if (totalPages <= 1) {
          if (active) setAllAccounts(firstItems);
          return;
        }

        const pages = [];
        for (let page = 2; page <= totalPages; page += 1) pages.push(page);
        const chunks = await Promise.all(
          pages.map((page) => accountsApi.list({ page, limit: 100, status: "ALL" }))
        );
        const extra = chunks.flatMap((entry) => (Array.isArray(entry?.items) ? entry.items : []));
        if (active) setAllAccounts([...firstItems, ...extra]);
      } catch (err) {
        if (active) {
          const msg = err?.response?.data?.message || "Failed to load reports.";
          setError(msg);
          toast.error(msg);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, []);

  const loanProducts = useMemo(() => {
    const set = new Set();
    allAccounts.forEach((item) => {
      const label = String(item?.loanProductName || item?.loanProductSlug || "").trim();
      if (label) set.add(label);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [allAccounts]);

  const filtered = useMemo(() => {
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null;
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59`) : null;

    return allAccounts.filter((item) => {
      if (status !== "ALL" && String(item?.status || "").toUpperCase() !== status) {
        return false;
      }

      const itemProduct = String(item?.loanProductName || item?.loanProductSlug || "").trim();
      if (loanProduct !== "ALL" && itemProduct !== loanProduct) {
        return false;
      }

      if (!fromDate && !toDate) return true;
      const disbursedDate = toDateValue(item?.disbursedAt) || toDateValue(item?.createdAt);
      if (!disbursedDate) return false;
      if (fromDate && disbursedDate < fromDate) return false;
      if (toDate && disbursedDate > toDate) return false;
      return true;
    });
  }, [allAccounts, dateFrom, dateTo, loanProduct, status]);

  const summary = useMemo(() => {
    const totalDisbursed = filtered.reduce((sum, item) => sum + Number(item?.disbursedAmount || 0), 0);
    const totalCollected = filtered.reduce((sum, item) => sum + Number(item?.totalPaidAmount || 0), 0);
    const totalDue = filtered.reduce(
      (sum, item) => sum + Number(item?.totalRepayment || item?.disbursedAmount || 0),
      0
    );
    const totalOutstanding = filtered.reduce(
      (sum, item) => sum + Number(item?.outstandingBalance || 0),
      0
    );
    const overdueAccounts = filtered.filter((item) => item?.status === "OVERDUE").length;
    const overdueAmount = filtered
      .filter((item) => item?.status === "OVERDUE")
      .reduce((sum, item) => sum + Number(item?.outstandingBalance || 0), 0);
    const collectionRate = totalDue > 0 ? (totalCollected / totalDue) * 100 : 0;
    const operationalProfit = totalCollected - totalDisbursed;
    const operationalProfitRate =
      totalDisbursed > 0 ? (operationalProfit / totalDisbursed) * 100 : 0;
    return {
      totalDisbursed,
      totalCollected,
      totalDue,
      totalOutstanding,
      overdueAccounts,
      overdueAmount,
      collectionRate,
      operationalProfit,
      operationalProfitRate,
    };
  }, [filtered]);

  const applyQuickRange = (range) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");

    if (range === "TODAY") {
      const today = `${y}-${m}-${d}`;
      setDateFrom(today);
      setDateTo(today);
      setQuickRange("TODAY");
      return;
    }

    if (range === "MONTH") {
      const first = `${y}-${m}-01`;
      const last = new Date(y, now.getMonth() + 1, 0);
      const lastDay = String(last.getDate()).padStart(2, "0");
      const end = `${y}-${m}-${lastDay}`;
      setDateFrom(first);
      setDateTo(end);
      setQuickRange("MONTH");
      return;
    }

    setDateFrom("");
    setDateTo("");
    setQuickRange("ALL");
  };

  const chartData = useMemo(() => {
    const end = new Date();
    const points = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(end.getFullYear(), end.getMonth() - i, 1);
      points.push({
        key: ymKey(d),
        label: d.toLocaleString("en-US", { month: "short" }),
        disbursed: 0,
        collected: 0,
      });
    }
    const map = new Map(points.map((item) => [item.key, item]));

    filtered.forEach((item) => {
      const disbursedDate = toDateValue(item?.disbursedAt);
      if (disbursedDate) {
        const key = ymKey(disbursedDate);
        const point = map.get(key);
        if (point) point.disbursed += Number(item?.disbursedAmount || 0);
      }

      const entries = Array.isArray(item?.repaymentEntries) ? item.repaymentEntries : [];
      entries.forEach((entry) => {
        const paidDate = toDateValue(entry?.paymentDate);
        if (!paidDate) return;
        const key = ymKey(paidDate);
        const point = map.get(key);
        if (point) point.collected += Number(entry?.amount || 0);
      });
    });

    return points;
  }, [filtered]);

  const maxChart = useMemo(() => {
    const vals = chartData.flatMap((item) => [item.disbursed, item.collected]);
    const max = Math.max(...vals, 0);
    return max > 0 ? max : 1;
  }, [chartData]);

  const monthlyTableRows = useMemo(() => {
    const rows = chartData.map((point) => {
      const gap = Number(point.disbursed || 0) - Number(point.collected || 0);
      return { ...point, gap };
    });

    let next = rows;
    if (monthlyGapFilter === "POSITIVE") {
      next = next.filter((row) => row.gap > 0);
    } else if (monthlyGapFilter === "NON_POSITIVE") {
      next = next.filter((row) => row.gap <= 0);
    }

    const sorted = [...next];
    if (monthlySort === "NEWEST") {
      sorted.sort((a, b) => String(b.key).localeCompare(String(a.key)));
    } else if (monthlySort === "HIGHEST_GAP") {
      sorted.sort((a, b) => b.gap - a.gap);
    } else if (monthlySort === "LOWEST_GAP") {
      sorted.sort((a, b) => a.gap - b.gap);
    }

    return sorted;
  }, [chartData, monthlyGapFilter, monthlySort]);

  const exportCsv = () => {
    try {
      setCsvLoading(true);
      const headers = [
        "Account No",
        "Customer",
        "Disbursed",
        "Collected",
        "Outstanding",
        "Next Due Date",
        "Status",
      ];
      const rows = filtered.map((item) => [
        item?.accountNumber || "",
        item?.customerName || "",
        Number(item?.disbursedAmount || 0),
        Number(item?.totalPaidAmount || 0),
        Number(item?.outstandingBalance || 0),
        item?.nextDueDate ? new Date(item.nextDueDate).toISOString().slice(0, 10) : "",
        item?.status || "",
      ]);

      const escaped = [headers, ...rows]
        .map((row) => row.map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`).join(","))
        .join("\n");

      const blob = new Blob([escaped], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `reports_${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      toast.success("CSV export completed.");
    } catch {
      toast.error("Failed to export CSV report.");
    } finally {
      setCsvLoading(false);
    }
  };

  const printSummary = () => {
    try {
      setPdfLoading(true);
      const popup = window.open("", "_blank", "width=1024,height=768");
      if (!popup) {
        toast.warning("Popup blocked. Allow popups to download report PDF.");
        return;
      }
    const now = new Date().toLocaleString();
    popup.document.write(`
      <html>
        <head>
          <title>Reports Summary</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; }
            .meta { color: #475569; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 20px; }
            .card { border: 1px solid #cbd5e1; border-radius: 10px; padding: 12px; }
            .label { font-size: 12px; text-transform: uppercase; color: #64748b; }
            .val { font-size: 24px; font-weight: 700; margin-top: 6px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; }
            th, td { border: 1px solid #e2e8f0; padding: 8px; text-align: left; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Reports Summary</h1>
          <div class="meta">Generated: ${now}</div>
          <div class="grid">
            <div class="card"><div class="label">Total Disbursed</div><div class="val">${formatMoney(summary.totalDisbursed)}</div></div>
            <div class="card"><div class="label">Total Collected</div><div class="val">${formatMoney(summary.totalCollected)}</div></div>
            <div class="card"><div class="label">Total Outstanding</div><div class="val">${formatMoney(summary.totalOutstanding)}</div></div>
            <div class="card"><div class="label">Overdue Accounts</div><div class="val">${summary.overdueAccounts}</div></div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Account No</th><th>Customer</th><th>Disbursed</th><th>Collected</th><th>Outstanding</th><th>Next Due</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filtered
                .map(
                  (item) => `
                <tr>
                  <td>${item?.accountNumber || "-"}</td>
                  <td>${item?.customerName || "-"}</td>
                  <td>${formatMoney(item?.disbursedAmount || 0)}</td>
                  <td>${formatMoney(item?.totalPaidAmount || 0)}</td>
                  <td>${formatMoney(item?.outstandingBalance || 0)}</td>
                  <td>${formatDate(item?.nextDueDate)}</td>
                  <td>${item?.status || "-"}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `);
    popup.document.close();
    popup.focus();
    popup.print();
    toast.success("Report PDF opened for print/download.");
    } catch {
      toast.error("Failed to generate report PDF.");
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Reports</h1>
          <p className="text-sm text-slate-500">
            Clean report view for disbursement, collection, and outstanding status.
          </p>
        </div>
        <Button variant="outline" onClick={printSummary} disabled={pdfLoading}>
          {pdfLoading ? "Preparing PDF..." : "Download Report (PDF)"}
        </Button>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Total Disbursed</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatMoney(summary.totalDisbursed)}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Total Collected</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{formatMoney(summary.totalCollected)}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Total Outstanding</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatMoney(summary.totalOutstanding)}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Overdue Accounts</p>
          <p className="mt-2 text-2xl font-bold text-rose-700">{summary.overdueAccounts}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Overdue Amount</p>
          <p className="mt-2 text-2xl font-bold text-rose-700">{formatMoney(summary.overdueAmount)}</p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">Collection Rate</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{summary.collectionRate.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-slate-500">
            {formatMoney(summary.totalCollected)} / {formatMoney(summary.totalDue)}
          </p>
        </div>
        <div className="rounded-xl border bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
            Operational Profit
          </p>
          <p
            className={[
              "mt-2 text-2xl font-bold",
              summary.operationalProfit >= 0 ? "text-emerald-700" : "text-rose-700",
            ].join(" ")}
          >
            {formatMoney(summary.operationalProfit)}
          </p>
          <p
            className={[
              "mt-1 text-xs font-semibold",
              summary.operationalProfitRate >= 0 ? "text-emerald-700" : "text-rose-700",
            ].join(" ")}
          >
            {summary.operationalProfitRate.toFixed(1)}% of disbursed
          </p>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => applyQuickRange("TODAY")}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              quickRange === "TODAY"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => applyQuickRange("MONTH")}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              quickRange === "MONTH"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            This Month
          </button>
          <button
            type="button"
            onClick={() => applyQuickRange("ALL")}
            className={[
              "rounded-full border px-3 py-1.5 text-xs font-semibold transition",
              quickRange === "ALL"
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
            ].join(" ")}
          >
            All Time
          </button>
        </div>
        <div className="grid gap-3 lg:grid-cols-5">
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-500">From Date</span>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setQuickRange("CUSTOM");
              }}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-500">To Date</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setQuickRange("CUSTOM");
              }}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Loan Product</span>
            <select
              value={loanProduct}
              onChange={(e) => setLoanProduct(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            >
              <option value="ALL">All</option>
              {loanProducts.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="h-10 w-full rounded-lg border border-slate-200 px-3 text-sm"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <div className="flex items-end gap-2">
            <Button variant="outline" onClick={exportCsv} disabled={csvLoading}>
              {csvLoading ? "Exporting..." : "Export CSV"}
            </Button>
            <Button variant="outline" onClick={printSummary} disabled={pdfLoading}>
              {pdfLoading ? "Preparing..." : "Print Summary"}
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-slate-900">Monthly Disbursed vs Collected (Last 6 Months)</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-6">
          {chartData.map((point) => {
            const disbursedHeight = Math.max(4, Math.round((point.disbursed / maxChart) * 120));
            const collectedHeight = Math.max(4, Math.round((point.collected / maxChart) * 120));
            return (
              <div key={point.key} className="rounded-lg border border-slate-100 bg-slate-50 p-2">
                <div className="flex h-36 items-end justify-center gap-2">
                  <div
                    title={`Disbursed: ${formatMoney(point.disbursed)}`}
                    className="w-4 rounded bg-slate-900"
                    style={{ height: `${disbursedHeight}px` }}
                  />
                  <div
                    title={`Collected: ${formatMoney(point.collected)}`}
                    className="w-4 rounded bg-emerald-500"
                    style={{ height: `${collectedHeight}px` }}
                  />
                </div>
                <p className="mt-2 text-center text-xs font-semibold text-slate-600">{point.label}</p>
                <p className="mt-1 text-center text-[11px] font-medium text-slate-700">
                  D: {formatMoneyCompactValue(point.disbursed)}
                </p>
                <p className="text-center text-[11px] font-medium text-emerald-700">
                  C: {formatMoneyCompactValue(point.collected)}
                </p>
              </div>
            );
          })}
        </div>
        <div className="mt-3 flex items-center gap-4 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-slate-900" />
            Disbursed
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded bg-emerald-500" />
            Collected
          </span>
        </div>

        <div className="mt-4 rounded-lg border border-slate-200">
          <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-slate-50 px-3 py-2">
            <label className="flex items-center gap-2 text-xs">
              <span className="font-medium text-slate-600">Gap</span>
              <select
                value={monthlyGapFilter}
                onChange={(e) => setMonthlyGapFilter(e.target.value)}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
              >
                <option value="ALL">All</option>
                <option value="POSITIVE">Only Positive Gap</option>
                <option value="NON_POSITIVE">Only Zero/Negative Gap</option>
              </select>
            </label>

            <label className="flex items-center gap-2 text-xs">
              <span className="font-medium text-slate-600">Sort</span>
              <select
                value={monthlySort}
                onChange={(e) => setMonthlySort(e.target.value)}
                className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs"
              >
                <option value="NEWEST">Newest First</option>
                <option value="HIGHEST_GAP">Highest Gap First</option>
                <option value="LOWEST_GAP">Lowest Gap First</option>
              </select>
            </label>
          </div>

          <div className="overflow-hidden">
          <table className="min-w-full divide-y divide-slate-200 text-xs">
            <thead className="bg-slate-50">
              <tr className="text-left font-semibold uppercase tracking-[0.12em] text-slate-500">
                <th className="px-3 py-2">Month</th>
                <th className="px-3 py-2">Disbursed</th>
                <th className="px-3 py-2">Collected</th>
                <th className="px-3 py-2">Gap</th>
                <th className="px-3 py-2">Profit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {monthlyTableRows.map((point) => {
                const gap = Number(point.gap || 0);
                const profit = Number(point.collected || 0) - Number(point.disbursed || 0);
                return (
                  <tr key={`${point.key}-table`}>
                    <td className="px-3 py-2 font-semibold text-slate-700">{point.label}</td>
                    <td className="px-3 py-2 text-slate-700">{formatMoney(point.disbursed)}</td>
                    <td className="px-3 py-2 text-emerald-700">{formatMoney(point.collected)}</td>
                    <td
                      className={[
                        "px-3 py-2 font-semibold",
                        gap > 0 ? "text-rose-700" : "text-emerald-700",
                      ].join(" ")}
                    >
                      {formatMoney(gap)}
                    </td>
                    <td
                      className={[
                        "px-3 py-2 font-semibold",
                        profit >= 0 ? "text-emerald-700" : "text-rose-700",
                      ].join(" ")}
                    >
                      {formatMoney(profit)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <th className="px-4 py-3">Account No</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Disbursed</th>
                <th className="px-4 py-3">Collected</th>
                <th className="px-4 py-3">Outstanding</th>
                <th className="px-4 py-3">Next Due Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={8}>
                    Loading report data...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={8}>
                    No records found for selected filters.
                  </td>
                </tr>
              ) : (
                filtered.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.accountNumber || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.customerName || "-"}</div>
                      <div className="text-xs text-slate-500">{item.loanProductName || item.loanProductSlug || "-"}</div>
                    </td>
                    <td className="px-4 py-3">{formatMoney(item.disbursedAmount)}</td>
                    <td className="px-4 py-3">{formatMoney(item.totalPaidAmount)}</td>
                    <td className="px-4 py-3">{formatMoney(item.outstandingBalance)}</td>
                    <td className="px-4 py-3">{formatDate(item.nextDueDate)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={STATUS_TONE[item.status] || "gray"}>{item.status || "ACTIVE"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/admin/payments/${item._id}`)}
                      >
                        View
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
