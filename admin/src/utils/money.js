export const truncateAmount = (value, decimals = 3) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return 0;
  const factor = 10 ** decimals;
  if (amount >= 0) return Math.floor((amount + Number.EPSILON) * factor) / factor;
  return Math.ceil((amount - Number.EPSILON) * factor) / factor;
};

export const formatMWK = (value, decimals = 3) => {
  const amount = truncateAmount(value, decimals);
  return Number.isFinite(amount)
    ? `MWK ${amount.toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: decimals,
      })}`
    : "-";
};

export const formatMWKCompact = (value, maximumFractionDigits = 1) => {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "MWK 0";
  return `MWK ${new Intl.NumberFormat("en-US", {
    notation: "compact",
    maximumFractionDigits,
  }).format(amount)}`;
};
