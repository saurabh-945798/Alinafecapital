import restockTechLogo from "../../assets/restock-tech-logo.png";
import restockTechLogoLight from "../../assets/restock-tech-logo-light.png";

export default function RestockTechLogo({
  className = "h-10 w-auto",
  compact = false,
  variant = "default",
}) {
  const logoSrc = variant === "light" ? restockTechLogoLight : restockTechLogo;
  const imageTone =
    variant === "light"
      ? "opacity-100 drop-shadow-[0_2px_10px_rgba(255,255,255,0.22)]"
      : "opacity-95 drop-shadow-[0_2px_5px_rgba(15,23,42,0.14)]";

  return (
    <span className="inline-flex items-center align-middle">
      <img
        src={logoSrc}
        alt="Restock Tech"
        className={`${className} object-contain ${imageTone}`}
      />
      {compact ? null : <span className="sr-only">Restock Tech</span>}
    </span>
  );
}

export function RestockTechSignature({
  label = "Powered by",
  className = "",
  logoClassName = "h-9 w-auto",
  tone = "dark",
}) {
  const isLight = tone === "light";
  const toneClass = isLight ? "text-white/75" : "text-slate-500";
  const logoVariant = isLight ? "light" : "default";

  return (
    <span className={["inline-flex items-center gap-2.5", className].filter(Boolean).join(" ")}>
      <span className={`text-[10px] font-semibold uppercase tracking-[0.18em] ${toneClass}`}>{label}</span>
      <RestockTechLogo className={logoClassName} variant={logoVariant} compact />
    </span>
  );
}
