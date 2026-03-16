import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, CheckCircle, Info, ShieldCheck } from "lucide-react";
import { api } from "../../services/api";
import { useLoanProducts } from "../../hooks/useLoanProducts";
import { guardStartApplication } from "../../utils/applyGuard";

const BRAND_NAVY = "#002D5B";
const BRAND_INDIGO = "#002D5B";
const BRAND_GOLD = "#B38E46";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const buildDetailsHref = (product) => `/loan-products/${product.slug}`;
const DESCRIPTION_PREVIEW_LIMIT = 132;

const getDescriptionPreview = (text = "") => {
  const normalized = String(text || "").trim();
  if (normalized.length <= DESCRIPTION_PREVIEW_LIMIT) {
    return { preview: normalized, truncated: false };
  }

  return {
    preview: `${normalized.slice(0, DESCRIPTION_PREVIEW_LIMIT).trimEnd()}...`,
    truncated: true,
  };
};

const LoanProducts = () => {
  const [activeFilter, setActiveFilter] = useState("All");
  const [expandedDescriptions, setExpandedDescriptions] = useState({});
  const navigate = useNavigate();
  const { loanProducts, loading, filterTabs, error } = useLoanProducts();

  useEffect(() => {
    if (filterTabs.length > 0 && !filterTabs.includes(activeFilter)) {
      setActiveFilter("All");
    }
  }, [filterTabs, activeFilter]);

  const featuredProduct = useMemo(
    () => loanProducts.find((p) => p.isFeatured) || loanProducts[0] || null,
    [loanProducts]
  );

  const showFeaturedProduct =
    !!featuredProduct && (activeFilter === "All" || activeFilter === featuredProduct.category);

  const filteredProducts = useMemo(() => {
    const base =
      activeFilter === "All"
        ? loanProducts
        : loanProducts.filter((p) => p.category === activeFilter);

    if (!featuredProduct) return base;
    return base.filter((p) => p.slug !== featuredProduct.slug);
  }, [activeFilter, featuredProduct, loanProducts]);

  const onApply = (productSlug) => {
    if (!productSlug) return;
    guardStartApplication({ productId: productSlug, navigate, api });
  };

  const toggleDescription = (slug) => {
    setExpandedDescriptions((prev) => ({
      ...prev,
      [slug]: !prev[slug],
    }));
  };

  return (
    <section
      className="relative py-20"
      aria-label="Loan Products"
      style={{
        background:
          "linear-gradient(135deg, rgba(0,45,91,0.06) 0%, rgba(0,45,91,0.03) 40%, rgba(255,255,255,1) 100%)",
      }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <header className="text-center max-w-3xl mx-auto">
          <p
            className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-2 rounded-full border bg-white/70 backdrop-blur"
            style={{ borderColor: "rgba(0,45,91,0.12)", color: BRAND_NAVY }}
          >
            <ShieldCheck size={16} />
            Trusted Microfinance Lending for Malawi
          </p>

          <h2 className="mt-6 text-4xl md:text-5xl font-bold tracking-tight" style={{ color: BRAND_NAVY }}>
            Popular Loan Products in Malawi
          </h2>

          <p className="mt-4 text-base md:text-lg text-gray-600">
            Designed around local repayment cycles, real market rates, and community-based financing.
          </p>
        </header>

        <div className="mt-12">
          <div
            className="mx-auto max-w-4xl p-2 rounded-2xl bg-white/80 backdrop-blur border shadow-sm overflow-x-auto"
            style={{ borderColor: "rgba(0,45,91,0.10)" }}
          >
            <div className="flex gap-2 min-w-max justify-start md:justify-center">
              {filterTabs.map((filter) => {
                const isActive = activeFilter === filter;
                return (
                  <button
                    key={filter}
                    onClick={() => setActiveFilter(filter)}
                    className={`px-4 py-2 rounded-full text-sm font-semibold transition ${
                      isActive
                        ? "text-white shadow-sm"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                    style={
                      isActive
                        ? {
                            backgroundColor: BRAND_INDIGO,
                            boxShadow: "0 10px 25px rgba(0,45,91,0.20)",
                          }
                        : {}
                    }
                  >
                    {filter}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {loading ? (
          <p className="mt-6 text-center text-sm text-gray-500">Loading products...</p>
        ) : null}
        {!loading && error ? (
          <p className="mt-4 text-center text-sm text-rose-700">{error}</p>
        ) : null}
        {!loading && !error && loanProducts.length === 0 ? (
          <p className="mt-4 text-center text-sm text-gray-600">
            Loan products are temporarily unavailable.
          </p>
        ) : null}

        {showFeaturedProduct && featuredProduct ? (
          <article
            className="mt-16 w-full rounded-3xl border p-7 md:p-10 shadow-xl"
            style={{
              borderColor: "rgba(179,142,70,0.35)",
              background:
                "linear-gradient(135deg, rgba(0,45,91,0.98) 0%, rgba(0,45,91,0.88) 60%, rgba(0,45,91,0.78) 100%)",
            }}
          >
            <div className="grid gap-8 lg:grid-cols-[1.5fr_0.9fr] lg:items-center">
              <div>
                <span
                  className="inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-bold"
                  style={{
                    backgroundColor: "rgba(179,142,70,0.18)",
                    borderColor: "rgba(179,142,70,0.45)",
                    color: BRAND_GOLD,
                  }}
                >
                  {featuredProduct.badge}
                </span>

                <h3 className="mt-4 text-2xl md:text-3xl font-bold text-white">{featuredProduct.loanName}</h3>
                <p className="mt-3 text-sm md:text-base text-white/85">{featuredProduct.description}</p>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border bg-white/5 p-3 text-sm text-white/90" style={{ borderColor: "rgba(255,255,255,0.18)" }}>
                    <p className="text-white/70">Amount</p>
                    <p className="mt-1 font-semibold">{featuredProduct.amountRange}</p>
                  </div>
                  <div className="rounded-xl border bg-white/5 p-3 text-sm text-white/90" style={{ borderColor: "rgba(255,255,255,0.18)" }}>
                    <p className="text-white/70">Repayment</p>
                    <p className="mt-1 font-semibold">{featuredProduct.repaymentPeriod}</p>
                  </div>
                  <div className="rounded-xl border bg-white/5 p-3 text-sm text-white/90" style={{ borderColor: "rgba(255,255,255,0.18)" }}>
                    <p className="text-white/70">Interest</p>
                    <p className="mt-1 font-semibold">{featuredProduct.interestRate}</p>
                  </div>
                </div>

                <ul className="mt-6 space-y-2 text-sm text-white/90">
                  {(featuredProduct.keyBenefits || []).slice(0, 3).map((benefit, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle size={16} style={{ color: BRAND_GOLD, marginTop: 2 }} />
                      {benefit}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-2xl border bg-white/10 p-5 md:p-6" style={{ borderColor: "rgba(255,255,255,0.22)" }}>
                <p className="text-xs uppercase tracking-wide text-white/70">Ready to apply?</p>
                <p className="mt-2 text-lg font-semibold text-white">
                  Get a fast decision and clear repayment terms.
                </p>

                <div className="mt-5 flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() => onApply(featuredProduct.slug)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 font-semibold text-white transition hover:opacity-95"
                    style={{ backgroundColor: BRAND_GOLD }}
                  >
                    Apply Now <ArrowRight size={16} />
                  </button>
                  <Link
                    to={buildDetailsHref(featuredProduct)}
                    className="inline-flex items-center justify-center gap-2 rounded-xl border px-4 py-3 font-semibold text-white transition hover:bg-white/10"
                    style={{ borderColor: "rgba(255,255,255,0.35)" }}
                  >
                    View Details <Info size={16} />
                  </Link>
                </div>
              </div>
            </div>
          </article>
        ) : null}

        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredProducts.map((product) => {
            const Icon = product.icon || ShieldCheck;
            const descriptionState = getDescriptionPreview(product.description);
            const isExpanded = Boolean(expandedDescriptions[product.slug]);
            const displayedDescription = isExpanded
              ? product.description
              : descriptionState.preview;

            return (
              <article
                key={product.slug}
                className={classNames(
                  "group bg-white rounded-2xl border p-6 shadow-sm transition hover:shadow-xl hover:-translate-y-1"
                )}
                style={{ borderColor: "rgba(0,45,91,0.10)" }}
              >
                <div className="flex items-start justify-between gap-3 w-full">
                  <div
                    className="h-11 w-11 rounded-2xl flex items-center justify-center border bg-white"
                    style={{
                      borderColor: "rgba(0,45,91,0.18)",
                      boxShadow: "0 10px 25px rgba(0,45,91,0.10)",
                    }}
                  >
                    <Icon size={18} style={{ color: BRAND_INDIGO }} />
                  </div>

                  <span
                    className="text-xs font-bold px-3 py-1.5 rounded-full border"
                    style={{
                      backgroundColor: "rgba(0,45,91,0.06)",
                      borderColor: "rgba(0,45,91,0.16)",
                      color: BRAND_INDIGO,
                    }}
                  >
                    {product.badge}
                  </span>
                </div>

                <div className="w-full">
                  <h4 className="mt-4 text-xl font-bold" style={{ color: BRAND_NAVY }}>
                    {product.loanName}
                  </h4>

                  <div className="mt-2 min-h-[72px]">
                    <p className="text-sm text-gray-600">{displayedDescription}</p>
                    {descriptionState.truncated ? (
                      <button
                        type="button"
                        onClick={() => toggleDescription(product.slug)}
                        className="mt-2 text-sm font-semibold"
                        style={{ color: BRAND_INDIGO }}
                      >
                        {isExpanded ? "Read less" : "Read more"}
                      </button>
                    ) : null}
                  </div>

                  <div
                    className="mt-5 rounded-2xl bg-gray-50 border p-4 text-sm"
                    style={{ borderColor: "rgba(0,45,91,0.08)" }}
                  >
                    <p>
                      <strong>Amount:</strong> {product.amountRange}
                    </p>
                    <p className="mt-2">
                      <strong>Tenor:</strong> {product.repaymentPeriod}
                    </p>
                    <p className="mt-2">
                      <strong>Interest:</strong> {product.interestRate}
                    </p>
                  </div>

                  <ul className="mt-5 space-y-2 text-sm text-gray-700">
                    {(product.keyBenefits || []).map((benefit, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <CheckCircle size={16} style={{ color: BRAND_INDIGO, marginTop: 2 }} />
                        {benefit}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6 flex gap-3">
                    <button
                      type="button"
                      onClick={() => onApply(product.slug)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold"
                      style={{ backgroundColor: BRAND_INDIGO }}
                    >
                      Apply Now <ArrowRight size={16} />
                    </button>

                    <Link
                      to={buildDetailsHref(product)}
                      className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border font-semibold bg-white"
                      style={{ borderColor: BRAND_GOLD, color: BRAND_GOLD }}
                    >
                      View Details <Info size={16} />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default LoanProducts;
