type Props = { size?: number; className?: string };

export default function Logo({ size = 36, className = '' }: Props) {
  const r    = size * 0.28;
  const fs   = size * 0.48;
  const dotR = (size * 0.18) / 2;
  const dotOff = size * 0.14;
  const dotCx = size - dotOff - dotR;
  const dotCy = size - dotOff - dotR;
  const gId = 'ap-admin-grad';

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} fill="none" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#0F766E" />
          <stop offset="100%" stopColor="#0A5C55" />
        </linearGradient>
      </defs>
      <rect width={size} height={size} rx={r} fill={`url(#${gId})`} />
      <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
        fill="white" fontSize={fs} fontWeight="800"
        fontFamily="var(--font-nunito), var(--font-tajawal), system-ui, sans-serif">
        A
      </text>
      <circle cx={dotCx} cy={dotCy} r={dotR} fill="#F59E0B" />
    </svg>
  );
}
