type Props = { size?: number; className?: string };

// Matches the Flutter BrandLogo widget:
//   gradient square (primary → primaryDark), bold "A" centred,
//   amber accent dot at bottom-right corner.
export default function Logo({ size = 36, className = '' }: Props) {
  const r      = size * 0.28;           // border-radius
  const fs     = size * 0.48;           // "A" font-size
  const dotR   = (size * 0.18) / 2;    // accent dot radius
  const dotOff = size * 0.14;          // inset from edges
  const dotCx  = size - dotOff - dotR;
  const dotCy  = size - dotOff - dotR;

  // Unique-ish IDs so multiple Logo instances on the same page
  // don't conflict (gradient & filter are identical so sharing is fine,
  // but explicit IDs keep validators happy).
  const gId = 'ap-brand-grad';
  const fId = 'ap-brand-shadow';

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <defs>
        {/* top-left → bottom-right gradient: primary → primaryDark */}
        <linearGradient id={gId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#0F766E" />
          <stop offset="100%" stopColor="#0A5C55" />
        </linearGradient>

        {/* drop-shadow matching Flutter BoxShadow(color: primary.20, blur:10, offset:(0,4)) */}
        <filter id={fId} x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="4" stdDeviation="5"
            floodColor="#0F766E" floodOpacity="0.2" />
        </filter>
      </defs>

      {/* Gradient background */}
      <rect
        width={size} height={size}
        rx={r}
        fill={`url(#${gId})`}
        filter={`url(#${fId})`}
      />

      {/* Bold "A" — centred */}
      <text
        x={size / 2}
        y={size / 2}
        textAnchor="middle"
        dominantBaseline="central"
        fill="white"
        fontSize={fs}
        fontWeight="800"
        fontFamily="var(--font-nunito), var(--font-tajawal), system-ui, sans-serif"
      >
        A
      </text>

      {/* Amber accent dot — bottom-right */}
      <circle cx={dotCx} cy={dotCy} r={dotR} fill="#F59E0B" />
    </svg>
  );
}
