const PALETTES = [
  { bg: '#EFF6FF', text: '#1D4ED8' },
  { bg: '#F0FDFA', text: '#0F766E' },
  { bg: '#FFFBEB', text: '#B45309' },
  { bg: '#ECFDF5', text: '#047857' },
  { bg: '#FFF1F2', text: '#BE123C' },
  { bg: '#F5F3FF', text: '#6D28D9' },
];

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export default function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const { bg, text } = PALETTES[name.charCodeAt(0) % PALETTES.length];
  const fontSize = Math.round(size * 0.35);
  return (
    <div
      className="rounded-full flex items-center justify-center font-bold shrink-0 ring-1 ring-black/[0.06]"
      style={{ width: size, height: size, fontSize, background: bg, color: text }}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
