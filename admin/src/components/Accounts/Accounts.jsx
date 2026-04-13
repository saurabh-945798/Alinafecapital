import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

const formatMoney = (value) => {
  const amount = Number(value || 0);
  return Number.isFinite(amount) ? `MWK ${amount.toLocaleString("en-US")}` : "-";
};

export default function AccountsPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");

  const fetchAccounts = async (page = 1) => {
    setLoading(true);
    setError("");
    try {
      const data = await accountsApi.list({ page, limit: 20, q });
      setItems(data?.items || []);
      setPagination(data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      const msg = err?.response?.data?.message || "Failed to load accounts.";
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAccounts(1);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Accounts</h1>
        <p className="text-sm text-slate-500">
          Active loan accounts created after disbursement. Use this area for post-disbursement tracking.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border bg-white p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="Search account no / application no / customer / phone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button variant="outline" onClick={() => fetchAccounts(1)}>
            Refresh
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Application</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Loan Product</th>
                <th className="px-4 py-3">Disbursed</th>
                <th className="px-4 py-3">Outstanding</th>
                <th className="px-4 py-3">Next Due</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white">
              {loading ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={9}>
                    Loading accounts...
                  </td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={9}>
                    No disbursed accounts found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item._id}>
                    <td className="px-4 py-3 font-semibold text-slate-900">{item.accountNumber}</td>
                    <td className="px-4 py-3 text-slate-700">{item.applicationCode || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.customerName}</div>
                      <div className="text-slate-500">{item.phone || "-"}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.loanProductName || item.loanProductSlug || "-"}</td>
                    <td className="px-4 py-3 text-slate-700">
                      <div>{formatMoney(item.disbursedAmount)}</div>
                      <div className="text-slate-500">{formatDate(item.disbursedAt)}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{formatMoney(item.outstandingBalance)}</td>
                    <td className="px-4 py-3 text-slate-700">{formatDate(item.nextDueDate)}</td>
                    <td className="px-4 py-3">
                      <Badge tone={ACCOUNT_STATUS_TONE[item.status] || "gray"}>
                        {item.status || "ACTIVE"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="outline" onClick={() => navigate(`/admin/accounts/${item._id}`)}>
                        View Account
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Page {pagination.page} of {pagination.totalPages} - Total {pagination.total}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={pagination.page <= 1 || loading}
            onClick={() => fetchAccounts(Math.max(1, pagination.page - 1))}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pagination.page >= pagination.totalPages || loading}
            onClick={() => fetchAccounts(Math.min(pagination.totalPages, pagination.page + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
