import { useId } from "react";

const AlinafeLogo = ({ className = "", showTagline = true, taglineText }) => {
  const uid = useId();

  // Unique IDs per component instance (prevents collisions if logo used multiple times)
  const goldGradientId = `goldGradient-${uid}`;
  const subtleDepthId = `subtleDepth-${uid}`;

  // Default tagline (full). For navbar, we pass showTagline={false}.
  const finalTagline =
    taglineText || "Empowering Growth, Transforming Lives.";

  return (
    <svg
      viewBox="-80 0 960 620"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Alinafe Capital Logo"
      className={className}
    >
      <defs>
        <linearGradient id={goldGradientId} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: "#8E6F2E", stopOpacity: 1 }} />
          <stop offset="40%" style={{ stopColor: "#B38E46", stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: "#D9C08E", stopOpacity: 1 }} />
        </linearGradient>

        <filter id={subtleDepthId} x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodOpacity="0.1" />
        </filter>
      </defs>

      <g transform="translate(400, 200)" filter={`url(#${subtleDepthId})`}>
        <path d="M-55 95 L0 -90 L55 95 H32 L0 -25 L-32 95 H-55Z" fill="#002D5B" />
        <path d="M-12 95 V45 H2 V95 H-12Z" fill="#002D5B" />
        <path d="M8 95 V15 H22 V95 H8Z" fill="#002D5B" />
        <path d="M28 95 V-15 H42 V95 H28Z" fill="#002D5B" />
        <path d="M-85 110 Q0 115 105 105 Q0 120 -85 110 Z" fill="#002D5B" />

        <g transform="translate(-150, 105)">
          <path
            d="M10 0 C30 -20 100 -120 260 -180"
            stroke={`url(#${goldGradientId})`}
            strokeWidth="7"
            fill="none"
            strokeLinecap="round"
          />
          <path
            d="M15 8 C35 -12 105 -112 265 -172"
            stroke="#8E6F2E"
            strokeWidth="2"
            fill="none"
            opacity="0.4"
          />
          <path
            d="M5 -5 C25 -25 95 -125 255 -185"
            stroke="#D9C08E"
            strokeWidth="2"
            fill="none"
            opacity="0.6"
          />
          <path d="M260 -180 L275 -190 L262 -165 L260 -180Z" fill="#B38E46" />
          <path d="M10 0 C-10 20 -20 60 50 45 C10 55 -5 30 10 0Z" fill="#B38E46" />
          <path
            d="M20 10 C5 30 0 70 65 55 C25 65 10 40 20 10Z"
            fill="#B38E46"
            opacity="0.6"
          />
        </g>
      </g>

      <g transform="translate(400, 395)">
        <text
          x="0"
          y="0"
          textAnchor="middle"
          fill="#002D5B"
          fontFamily="Georgia, serif"
          fontWeight="700"
          letterSpacing="2"
          fontSize="88"
        >
          ALINAFE
        </text>
      </g>

      <g transform="translate(400, 445)">
        <text
          x="0"
          y="0"
          textAnchor="middle"
          fill="#B38E46"
          fontFamily="Verdana, sans-serif"
          fontWeight="700"
          letterSpacing="12"
          fontSize="38"
        >
          CAPITAL
        </text>
      </g>

      <line
        x1="220"
        y1="475"
        x2="580"
        y2="475"
        stroke="#B38E46"
        strokeWidth="1.5"
        opacity="0.8"
      />

      {/* Tagline: optional (hide in navbar version) */}
      {showTagline && (
        <g transform="translate(400, 520)">
          <text
            x="0"
            y="0"
            textAnchor="middle"
            fill="#002D5B"
            fontFamily="Georgia, serif"
            fontStyle="italic"
            fontSize="34"
          >
            {finalTagline}
          </text>
        </g>
      )}
    </svg>
  );
};

export default AlinafeLogo;
