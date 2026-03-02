const cx = (...a) => a.filter(Boolean).join(" ");

export default function Button({
  children,
  variant = "primary",
  size = "md",
  className = "",
  ...props
}) {
  const base =
    "inline-flex items-center justify-center rounded-xl font-semibold transition active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed";

  const variants = {
    primary: "bg-slate-900 text-white hover:bg-slate-800",
    secondary: "bg-slate-100 text-slate-900 hover:bg-slate-200",
    danger: "bg-rose-600 text-white hover:bg-rose-700",
    outline: "border border-slate-200 bg-white text-slate-900 hover:bg-slate-50",
  };

  const sizes = {
    sm: "h-9 px-3 text-sm",
    md: "h-10 px-4 text-sm",
    lg: "h-11 px-5 text-base",
  };

  return (
    <button
      className={cx(base, variants[variant], sizes[size], className)}
      {...props}
    >
      {children}
    </button>
  );
}