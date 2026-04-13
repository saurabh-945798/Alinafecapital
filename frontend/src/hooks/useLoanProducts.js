import { useEffect, useMemo, useState } from "react";
import { api } from "../services/api";

const FALLBACK_CATEGORY = "Personal";

const keywordCategory = (raw = "") => {
  const text = String(raw).toLowerCase();
  if (text.includes("group") || text.includes("village")) return "Group";
  if (
    text.includes("agri") ||
    text.includes("farm") ||
    text.includes("irrigation") ||
    text.includes("tractor")
  ) {
    return "Agriculture";
  }
  if (text.includes("business") || text.includes("sme") || text.includes("merchant")) {
    return "Business";
  }
  return FALLBACK_CATEGORY;
};

const formatMoney = (currency = "MWK", value = 0) =>
  `${currency} ${Number(value || 0).toLocaleString("en-US")}`;

const formatAmountRange = (product) => {
  if (
    typeof product?.minAmount === "number" &&
    typeof product?.maxAmount === "number" &&
    product.maxAmount >= product.minAmount
  ) {
    return `${formatMoney(product.currency, product.minAmount)} - ${formatMoney(
      product.currency,
      product.maxAmount
    )}`;
  }
  return "Subject to eligibility";
};

const formatTenure = (product) => {
  const min = Number(product?.minTenureMonths);
  const max = Number(product?.maxTenureMonths);
  if (!Number.isFinite(min) || !Number.isFinite(max) || min <= 0 || max <= 0) return "As per product policy";
  if (min === max) return `${min} month${min > 1 ? "s" : ""}`;
  return `${min} - ${max} months`;
};

const formatInterest = (product) => {
  if (typeof product?.interestRateMonthly === "number") {
    const rawRate = Number(product.interestRateMonthly);
    const pctValue = rawRate <= 1 ? rawRate * 100 : rawRate;
    const pct = pctValue.toFixed(1);
    const type = product?.interestType === "flat" ? "flat" : "reducing";
    return `${pct}% monthly (${type})`;
  }
  return "Profile-based pricing";
};

const normalizeProducts = (backendItems = []) => {
  return backendItems.map((item, idx) => {
    const category = item?.category || keywordCategory(`${item.slug} ${item.name}`);

    return {
      id: idx + 1,
      slug: item.slug,
      loanName: item.name || "Loan Product",
      category,
      badge: item.featured ? "Most Popular" : "Active",
      isFeatured: Boolean(item.featured),
      description:
        item.description ||
        "Flexible financing with clear terms and transparent pricing.",
      amountRange: formatAmountRange(item),
      repaymentPeriod: formatTenure(item),
      interestRate: formatInterest(item),
      keyBenefits: [
        "Fast review and transparent terms",
        "Simple eligibility checks",
        "Repayment schedule agreed before acceptance",
      ],
      minAmount: item.minAmount,
      maxAmount: item.maxAmount,
      minTenureMonths: item.minTenureMonths,
      maxTenureMonths: item.maxTenureMonths,
      raw: item,
    };
  });
};

export const useLoanProducts = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchProducts = async () => {
    setLoading(true);
    setError("");
    try {
      const { data } = await api.get("/loan-products");
      const items = Array.isArray(data?.data)
        ? data.data
        : Array.isArray(data?.data?.items)
        ? data.data.items
        : Array.isArray(data?.items)
        ? data.items
        : [];
      const normalized = normalizeProducts(items);
      setProducts(normalized);
      if (normalized.length === 0) {
        setError("No active loan products available.");
      }
    } catch (err) {
      setProducts([]);
      setError(err?.response?.data?.message || "Unable to fetch loan products.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const filterTabs = useMemo(() => {
    const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
    return ["All", ...categories];
  }, [products]);

  return {
    loanProducts: products,
    loading,
    error,
    filterTabs,
    refreshLoanProducts: fetchProducts,
  };
};
