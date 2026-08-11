export const parseMoneyInput = (value, fallback = 0) => {
  if (value === undefined || value === null || value === "") return fallback;
  const normalized = String(value)
    .replace(/,/g, "")
    .replace(/[^0-9.-]/g, "")
    .trim();
  if (!normalized || normalized === "." || normalized === "-" || normalized === "-.") return fallback;
  const amount = Number(normalized);
  return Number.isFinite(amount) ? amount : fallback;
};

export const formatMoneyInput = (value, maxDecimals = 3) => {
  if (value === undefined || value === null || value === "") return "";
  const raw = String(value)
    .replace(/,/g, "")
    .replace(/[^0-9.]/g, "");

  if (!raw) return "";

  const hasTrailingDecimal = raw.endsWith(".");
  const [integerPartRaw = "", ...decimalParts] = raw.split(".");
  const integerPart = integerPartRaw.replace(/^0+(?=\d)/, "") || "0";
  const decimals = decimalParts.join("").slice(0, maxDecimals);
  const groupedInteger = Number(integerPart).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  });

  if (hasTrailingDecimal && maxDecimals > 0) return `${groupedInteger}.`;
  if (decimals && maxDecimals > 0) return `${groupedInteger}.${decimals}`;
  return groupedInteger;
};
