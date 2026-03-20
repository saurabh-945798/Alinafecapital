import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../ui/Button";
import Badge from "../ui/Badge";
import { inquiriesApi } from "../../services/api/inquiries.api";
import { useToast } from "../../context/ToastContext.jsx";
import { ADMIN_FILE_BASE_URL } from "../../config/api";

const STATUS_TONE = {
  NEW: "amber",
  CONTACTED: "blue",
  KYC_SENT: "blue",
  KYC_REJECTED: "red",
  APPROVED: "green",
  QUALIFIED: "green",
  CLOSED: "gray",
};

const SIMPLE_TABS = [
  { value: "ALL", label: "All" },
  { value: "NEW", label: "New" },
  { value: "CONTACTED", label: "Pending" },
  { value: "KYC_SENT", label: "Needs KYC" },
  { value: "APPROVED", label: "Approved" },
  { value: "KYC_REJECTED", label: "Rejected" },
  { value: "CLOSED", label: "Closed" },
];

const KYC_TONE = {
  not_started: "gray",
  pending: "amber",
  verified: "green",
  rejected: "red",
};

const HUMAN_STATUS = {
  NEW: "New",
  CONTACTED: "Pending",
  KYC_SENT: "Needs KYC",
  KYC_REJECTED: "KYC Rejected",
  APPROVED: "Approved",
  QUALIFIED: "Approved",
  CLOSED: "Closed",
};

const HUMAN_KYC = {
  not_started: "Not Started",
  pending: "Pending",
  verified: "Verified",
  rejected: "Rejected",
};

const formatDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "-" : d.toLocaleString();
};

export default function LoanApplication() {
  const navigate = useNavigate();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [status, setStatus] = useState("ALL");
  const [brokenAvatars, setBrokenAvatars] = useState({});
  const [counts, setCounts] = useState({
    ALL: 0,
    NEW: 0,
    CONTACTED: 0,
    KYC_SENT: 0,
    APPROVED: 0,
    KYC_REJECTED: 0,
    CLOSED: 0,
  });
  const fetchIdRef = useRef(0);

  const resolveAssetUrl = (fileUrl = "") => {
    if (!fileUrl) return "";
    if (fileUrl.startsWith("http")) return fileUrl;
    return `${ADMIN_FILE_BASE_URL}${fileUrl.startsWith("/") ? fileUrl : `/${fileUrl}`}`;
  };

  const fetchList = async (page = pagination.page) => {
    const currentFetchId = ++fetchIdRef.current;
    setLoading(true);
    setError("");
    setItems([]);
    setPagination((prev) => ({ ...prev, page, total: 0, totalPages: 1 }));
    try {
      const data = await inquiriesApi.list({ page, limit: 20, q: debouncedQuery, status });
      if (currentFetchId !== fetchIdRef.current) return;
      setItems(data?.items || []);
      setPagination(data?.pagination || { page: 1, limit: 20, total: 0, totalPages: 1 });
    } catch (err) {
      if (currentFetchId !== fetchIdRef.current) return;
      const msg = err?.response?.data?.message || "Failed to load loan inquiries.";
      setError(msg);
      toast.error(msg);
    } finally {
      if (currentFetchId === fetchIdRef.current) {
        setLoading(false);
      }
    }
  };

  const fetchCounts = async () => {
    try {
      const statuses = ["ALL", "NEW", "CONTACTED", "KYC_SENT", "APPROVED", "KYC_REJECTED", "CLOSED"];
      const responses = await Promise.all(
        statuses.map((value) =>
          inquiriesApi.list({
            status: value,
            page: 1,
            limit: 1,
          })
        )
      );

      const nextCounts = statuses.reduce((acc, value, index) => {
        acc[value] = Number(responses[index]?.pagination?.total || 0);
        return acc;
      }, {});

      setCounts((prev) => ({ ...prev, ...nextCounts }));
    } catch {
      // counts are secondary UI data; keep the page usable even if they fail
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(q);
    }, 250);

    return () => window.clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    fetchList(1);
  }, [debouncedQuery, status]);

  useEffect(() => {
    fetchCounts();
  }, []);

  const openDetails = (item) => {
    navigate(`/admin/applications/${item._id}`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Loan Inquiries</h1>
        <p className="text-sm text-slate-500">
          Review customer requests in a simple card view and open full details when needed.
        </p>
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <div className="rounded-xl border bg-white p-4 space-y-4">
        <div className="flex flex-wrap gap-2">
          {SIMPLE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setStatus(tab.value)}
              className={[
                "rounded-full border px-4 py-2 text-sm font-semibold transition",
                status === tab.value
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50",
              ].join(" ")}
            >
              <span>{tab.label}</span>
              <span
                className={[
                  "ml-2 inline-flex min-w-6 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                  status === tab.value ? "bg-white/15 text-white" : "bg-slate-100 text-slate-700",
                ].join(" ")}
              >
                {counts[tab.value] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto]">
          <input
            className="h-10 rounded-lg border border-slate-200 px-3 text-sm"
            placeholder="Search name / phone / email / loan type"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button
            variant="outline"
            onClick={() => {
              fetchList(1);
              fetchCounts();
            }}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {loading ? (
          <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">
            Loading inquiries...
          </div>
        ) : items.length === 0 ? (
          <div className="rounded-xl border bg-white p-6 text-sm text-slate-500">
            No loan inquiries found.
          </div>
        ) : (
          items.map((item) => (
            <article
              key={item._id}
              className="rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-slate-900">{item.fullName}</h3>
                  <p className="text-sm text-slate-500">{item.phone}</p>
                  <p className="text-sm text-slate-500">{item.email || "No email provided"}</p>
                </div>
                {item.avatarUrl && !brokenAvatars[item._id] ? (
                  <img
                    src={resolveAssetUrl(item.avatarUrl)}
                    alt={item.fullName || "Customer"}
                    className="h-11 w-11 rounded-full object-cover border border-slate-200"
                    onError={() =>
                      setBrokenAvatars((prev) => ({
                        ...prev,
                        [item._id]: true,
                      }))
                    }
                  />
                ) : (
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-700">
                    {String(item.fullName || "U").trim().charAt(0).toUpperCase() || "U"}
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Loan Type
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {item.loanProductName || item.loanProductSlug}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    Created
                  </p>
                  <p className="mt-1 text-sm font-medium text-slate-900">
                    {formatDate(item.createdAt)}
                  </p>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Address
                </p>
                <p className="mt-1 text-sm text-slate-700">{item.address || "-"}</p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Badge tone={STATUS_TONE[item.status] || "gray"}>
                  {HUMAN_STATUS[item.status] || item.status}
                </Badge>
                <Badge tone={KYC_TONE[item.kycStatus] || "gray"}>
                  KYC: {HUMAN_KYC[item.kycStatus] || item.kycStatus || "Not Started"}
                </Badge>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => openDetails(item)}>
                  View Details
                </Button>
              </div>
            </article>
          ))
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Page {pagination.page} of {pagination.totalPages} - Total {pagination.total}
        </p>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={pagination.page <= 1}
            onClick={() => fetchList(Math.max(1, pagination.page - 1))}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={pagination.page >= pagination.totalPages}
            onClick={() => fetchList(Math.min(pagination.totalPages, pagination.page + 1))}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
