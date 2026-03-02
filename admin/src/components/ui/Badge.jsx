const cx = (...a) => a.filter(Boolean).join(" ");

export default function Badge({ children, tone = "gray" }) {
  const tones = {
    gray: "bg-slate-100 text-slate-700",
    green: "bg-emerald-100 text-emerald-800",
    blue: "bg-blue-100 text-blue-800",
    amber: "bg-amber-100 text-amber-900",
    red: "bg-rose-100 text-rose-800",
  };
  return (
    <span className={cx("px-2.5 py-1 rounded-full text-xs font-semibold", tones[tone])}>
      {children}
    </span>
  );
}