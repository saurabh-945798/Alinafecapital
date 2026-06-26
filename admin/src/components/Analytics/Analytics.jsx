import { useEffect, useMemo, useState } from "react";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import "../../utils/chartjs";
import { Activity, CalendarDays, FileText, PieChart as PieIcon, RefreshCw } from "lucide-react";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { analyticsApi } from "../../services/api/analytics.api";
import { useToast } from "../../context/ToastContext.jsx";
import { formatMWKCompact } from "../../utils/money.js";

const STATUS_OPTIONS = [
  { value: "ALL", label: "All statuses" },
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Contacted" },
  { value: "KYC_SENT", label: "KYC Sent" },
  { value: "VERIFIED", label: "Verified" },
  { value: "KYC_REJECTED", label: "Rejected" },
  { value: "APPROVED", label: "Approved" },
  { value: "AUTHORIZED", label: "Authorized" },
  { value: "DISBURSED", label: "Disbursed" },
  { value: "CLOSED", label: "Closed" },
];

const QUICK_RANGES = [
  { value: "7D", label: "Last 7 days" },
  { value: "30D", label: "Last 30 days" },
  { value: "MONTH", label: "This month" },
  { value: "YEAR", label: "This year" },
];

const COLORS = ["#0f172a", "#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed", "#0891b2", "#64748b"];

const defaultFilters = { from: "", to: "", status: "ALL", loanProduct: "ALL" };

const cx = (...items) => items.filter(Boolean).join(" ");
const toInputDate = (date) => date.toISOString().slice(0, 10);

const getQuickRange = (range) => {
  const now = new Date();
  const start = new Date(now);
  if (range === "7D") start.setDate(now.getDate() - 6);
  if (range === "30D") start.setDate(now.getDate() - 29);
  if (range === "MONTH") start.setDate(1);
  if (range === "YEAR") {
    start.setMonth(0);
    start.setDate(1);
  }
  return { from: toInputDate(start), to: toInputDate(now) };
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

const formatNumber = (value) => Number(value || 0).toLocaleString();

const EmptyChart = ({ message = "No data for the selected filters." }) => (
  <div className="flex h-72 items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 text-sm text-slate-500">
    {message}
  </div>
);

const Select = ({ value, onChange, children, label }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400"
    >
      {children}
    </select>
  </label>
);

const DateInput = ({ label, value, onChange }) => (
  <label className="block">
    <span className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</span>
    <input
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-800 outline-none focus:border-slate-400"
    />
  </label>
);

const KpiCard = ({ title, value, subtitle, icon: Icon, tone = "slate" }) => {
  const tones = {
    slate: "bg-slate-900 text-white",
    blue: "bg-blue-600 text-white",
    green: "bg-emerald-600 text-white",
    amber: "bg-amber-500 text-white",
    red: "bg-rose-600 text-white",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-2xl font-bold text-slate-950">{value}</p>
          {subtitle ? <p className="mt-1 text-xs text-slate-500">{subtitle}</p> : null}
        </div>
        <div className={cx("rounded-2xl p-3", tones[tone] || tones.slate)}>
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
};

const ChartCard = ({ title, subtitle, children }) => (
  <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="mb-4">
      <h2 className="text-base font-semibold text-slate-950">{title}</h2>
      {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
    </div>
    {children}
  </section>
);

const baseChartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { labels: { boxWidth: 12, color: "#475569", font: { size: 12 } } },
    tooltip: { backgroundColor: "#0f172a", titleColor: "#fff", bodyColor: "#fff", padding: 12, cornerRadius: 12 },
  },
};

const axisOptions = {
  grid: { color: "#e2e8f0" },
  ticks: { color: "#64748b", font: { size: 12 }, precision: 0 },
};

export default function AnalyticsPage() {
  const toast = useToast();
  const [filters, setFilters] = useState(defaultFilters);
  const [draftFilters, setDraftFilters] = useState(defaultFilters);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await analyticsApi.getAnalyticsSummary(filters);
      setData(response || {});
    } catch (err) {
      const message = err?.response?.data?.message || "Failed to load analytics.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [filters]);

  const kpis = data?.kpis || {};
  const applicationsOverTime = Array.isArray(data?.applicationsOverTime) ? data.applicationsOverTime : [];
  const byStatus = Array.isArray(data?.byStatus) ? data.byStatus : [];
  const byProduct = Array.isArray(data?.byProduct) ? data.byProduct : [];
  const kycProgress = Array.isArray(data?.kycProgress) ? data.kycProgress : [];
  const recentApplications = Array.isArray(data?.recentApplications) ? data.recentApplications : [];

  const productOptions = useMemo(() => {
    const seen = new Set();
    return byProduct
      .map((item) => ({ value: item.slug || item.product, label: item.product || item.slug }))
      .filter((item) => {
        if (!item.value || seen.has(item.value)) return false;
        seen.add(item.value);
        return true;
      });
  }, [byProduct]);

  const lineData = useMemo(() => ({
    labels: applicationsOverTime.map((item) => item.date),
    datasets: [{ label: "Applications", data: applicationsOverTime.map((item) => Number(item.count || 0)), borderColor: "#0f172a", backgroundColor: "rgba(15, 23, 42, 0.12)", fill: true, tension: 0.35, pointRadius: 3, pointHoverRadius: 5 }],
  }), [applicationsOverTime]);

  const productChartData = useMemo(() => {
    const items = byProduct.slice(0, 8);
    return { labels: items.map((item) => item.product || "Unassigned"), datasets: [{ label: "Applications", data: items.map((item) => Number(item.count || 0)), backgroundColor: "#2563eb", borderRadius: 10 }] };
  }, [byProduct]);

  const statusChartData = useMemo(() => ({
    labels: byStatus.map((item) => item.status),
    datasets: [{ label: "Applications", data: byStatus.map((item) => Number(item.count || 0)), backgroundColor: byStatus.map((_, index) => COLORS[index % COLORS.length]), borderWidth: 2, borderColor: "#ffffff" }],
  }), [byStatus]);

  const kycChartData = useMemo(() => ({
    labels: kycProgress.map((item) => item.status),
    datasets: [{ label: "Applications", data: kycProgress.map((item) => Number(item.count || 0)), backgroundColor: "#059669", borderRadius: 10 }],
  }), [kycProgress]);

  const applyQuickRange = (range) => setDraftFilters((current) => ({ ...current, ...getQuickRange(range) }));
  const applyFilters = () => setFilters(draftFilters);
  const resetFilters = () => {
    setDraftFilters(defaultFilters);
    setFilters(defaultFilters);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm lg:flex-row lg:items-center">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-950">Analytics</h1>
            <Badge tone="blue">SUPER ADMIN ONLY</Badge>
          </div>
          <p className="mt-2 text-sm text-slate-500">Application and business performance overview</p>
        </div>
        <Button variant="outline" onClick={load} disabled={loading}>
          <RefreshCw size={16} className={cx("mr-2", loading && "animate-spin")} />
          Refresh
        </Button>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap gap-2">
          {QUICK_RANGES.map((item) => (
            <Button key={item.value} type="button" size="sm" variant="secondary" onClick={() => applyQuickRange(item.value)}>{item.label}</Button>
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
          <DateInput label="From" value={draftFilters.from} onChange={(value) => setDraftFilters((current) => ({ ...current, from: value }))} />
          <DateInput label="To" value={draftFilters.to} onChange={(value) => setDraftFilters((current) => ({ ...current, to: value }))} />
          <Select label="Status" value={draftFilters.status} onChange={(value) => setDraftFilters((current) => ({ ...current, status: value }))}>
            {STATUS_OPTIONS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <Select label="Loan Product" value={draftFilters.loanProduct} onChange={(value) => setDraftFilters((current) => ({ ...current, loanProduct: value }))}>
            <option value="ALL">All products</option>
            {productOptions.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
          </Select>
          <div className="flex items-end"><Button className="w-full" onClick={applyFilters} disabled={loading}>Apply</Button></div>
          <div className="flex items-end"><Button className="w-full" variant="outline" onClick={resetFilters} disabled={loading}>Reset</Button></div>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-800">
          <p className="font-semibold">Unable to load analytics</p>
          <p className="mt-1">{error}</p>
          <Button className="mt-4" variant="danger" onClick={load}>Retry</Button>
        </div>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500 shadow-sm">Loading analytics data...</div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KpiCard title="Total Applications" value={formatNumber(kpis.totalApplications)} icon={FileText} />
            <KpiCard title="Pending" value={formatNumber(kpis.pending)} icon={Activity} tone="amber" />
            <KpiCard title="Verified" value={formatNumber(kpis.verified)} icon={Activity} tone="green" />
            <KpiCard title="Approved" value={formatNumber(kpis.approved)} icon={Activity} tone="green" />
            <KpiCard title="Authorized" value={formatNumber(kpis.authorized)} icon={Activity} tone="blue" />
            <KpiCard title="Disbursed" value={formatNumber(kpis.disbursed)} icon={Activity} tone="blue" />
            <KpiCard title="Rejected" value={formatNumber(kpis.rejected)} icon={Activity} tone="red" />
            <KpiCard title="Total Requested Amount" value={formatMWKCompact(kpis.totalRequestedAmount || 0, 1)} icon={CalendarDays} />
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <ChartCard title="Applications Over Time" subtitle="Daily applications based on created date.">
              {applicationsOverTime.length ? <div className="h-72"><Line data={lineData} options={{ ...baseChartOptions, plugins: { ...baseChartOptions.plugins, legend: { display: false } }, scales: { x: axisOptions, y: { ...axisOptions, beginAtZero: true } } }} /></div> : <EmptyChart />}
            </ChartCard>
            <ChartCard title="Applications by Loan Product" subtitle="Top loan products by application count.">
              {byProduct.length ? <div className="h-72"><Bar data={productChartData} options={{ ...baseChartOptions, plugins: { ...baseChartOptions.plugins, legend: { display: false } }, scales: { x: { ...axisOptions, ticks: { ...axisOptions.ticks, maxRotation: 35, minRotation: 0 } }, y: { ...axisOptions, beginAtZero: true } } }} /></div> : <EmptyChart />}
            </ChartCard>
            <ChartCard title="Application Status Distribution" subtitle="Workflow stage split for selected filters.">
              {byStatus.length ? <div className="h-72"><Doughnut data={statusChartData} options={{ ...baseChartOptions, cutout: "62%", plugins: { ...baseChartOptions.plugins, legend: { position: "bottom", labels: baseChartOptions.plugins.legend.labels } } }} /></div> : <EmptyChart />}
            </ChartCard>
            <ChartCard title="KYC Progress" subtitle="Customer KYC status across applications.">
              {kycProgress.length ? <div className="h-72"><Bar data={kycChartData} options={{ ...baseChartOptions, indexAxis: "y", plugins: { ...baseChartOptions.plugins, legend: { display: false } }, scales: { x: { ...axisOptions, beginAtZero: true }, y: axisOptions } }} /></div> : <EmptyChart />}
            </ChartCard>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-3 border-b border-slate-100 p-5">
              <PieIcon size={18} className="text-slate-500" />
              <div>
                <h2 className="text-base font-semibold text-slate-950">Recent Applications</h2>
                <p className="text-sm text-slate-500">Latest submitted applications in the selected range.</p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-100 text-sm">
                <thead className="bg-slate-50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Application No.</th><th className="px-5 py-3">Customer</th><th className="px-5 py-3">Loan Product</th><th className="px-5 py-3">Status</th><th className="px-5 py-3">Requested Amount</th><th className="px-5 py-3">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {recentApplications.length ? recentApplications.map((item) => (
                    <tr key={item.id || item.applicationNo} className="hover:bg-slate-50">
                      <td className="px-5 py-4 font-semibold text-slate-900">{item.applicationNo || "-"}</td>
                      <td className="px-5 py-4 text-slate-700">{item.customerName || "-"}</td>
                      <td className="px-5 py-4 text-slate-700">{item.loanProductName || "-"}</td>
                      <td className="px-5 py-4"><Badge tone="gray">{item.status || "-"}</Badge></td>
                      <td className="px-5 py-4 text-slate-700">{formatMWKCompact(item.requestedAmount || 0, 1)}</td>
                      <td className="px-5 py-4 text-slate-700">{formatDate(item.createdAt)}</td>
                    </tr>
                  )) : (
                    <tr><td className="px-5 py-8 text-center text-slate-500" colSpan={6}>No recent applications found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}