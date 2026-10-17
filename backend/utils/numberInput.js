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

export const normalizeMoneyForValidation = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return value;
  return trimmed.replace(/,/g, "").replace(/[^0-9.-]/g, "");
};
