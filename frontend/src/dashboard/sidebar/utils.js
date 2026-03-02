export function clampNumber(n, min, max) {
  const x = Number.isFinite(Number(n)) ? Number(n) : 0;
  return Math.max(min, Math.min(max, x));
}

export function getInitials(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "A";
  return (parts[0]?.[0] || "A").toUpperCase();
}

export function formatDateLoose(input) {
  try {
    const d = new Date(input);
    if (Number.isNaN(d.getTime())) return String(input);
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
  } catch {
    return String(input);
  }
}
