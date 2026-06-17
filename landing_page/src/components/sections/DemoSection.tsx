import { useTranslations } from 'next-intl';
import SecHead from '@/components/ui/SecHead';
import ScrollReveal from '@/components/ui/ScrollReveal';

const SCREEN_ROWS = [132, 168];
const RECEIPT_ROWS = [174, 187, 200];
const PARTICLES = [
  [300, 120], [420, 304], [560, 108], [680, 250], [760, 138],
  [184, 258], [636, 322], [884, 162], [504, 92], [726, 330], [232, 150], [592, 286],
];

export default function DemoSection() {
  const t = useTranslations('demo');

  return (
    <section id="demo" className="sec sec-divider demo-screen">
      <div className="container-page">
        <SecHead eyebrow={t('eyebrow')} title={<>{t('h2')} <em>{t('h2Accent')}</em></>} lede={t('sub')} />

        <ScrollReveal className="pos-scene">
          <svg className="pos-art" viewBox="0 56 1000 360" fill="none" aria-hidden="true">
            <defs>
              <linearGradient id="gBody" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#22303f" /><stop offset="1" stopColor="#0b1420" />
              </linearGradient>
              <linearGradient id="gScreen" x1="0" y1="0" x2="0.4" y2="1">
                <stop offset="0" stopColor="#0f2229" /><stop offset="1" stopColor="#07111a" />
              </linearGradient>
              <radialGradient id="gFloor" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="rgba(45,212,191,0.20)" /><stop offset="1" stopColor="rgba(45,212,191,0)" />
              </radialGradient>
              <linearGradient id="gBeam" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="rgba(45,212,191,0.55)" /><stop offset="1" stopColor="rgba(45,212,191,0.04)" />
              </linearGradient>
              <linearGradient id="gSheen" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="rgba(255,255,255,0.06)" /><stop offset="1" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
              <clipPath id="rcClip"><rect x="758" y="80" width="86" height="210" /></clipPath>
            </defs>

            {/* floating glows */}
            <ellipse cx="500" cy="400" rx="184" ry="18" fill="url(#gFloor)" />
            <ellipse cx="200" cy="396" rx="92" ry="12" fill="url(#gFloor)" />
            <ellipse cx="800" cy="402" rx="104" ry="14" fill="url(#gFloor)" />

            {/* particles */}
            <g className="cy-particles">
              {PARTICLES.map(([x, y], i) => (
                <circle key={i} className="dot glow" cx={x} cy={y} r={i % 3 === 0 ? 2.6 : 1.8} opacity="0.6" />
              ))}
            </g>

            {/* data path: monitor → printer */}
            <path className="neon dash ln-data glow" d="M652 150 C702 150 722 184 760 206" opacity="0.55" />

            {/* ── monitor ── */}
            <rect className="body" x="348" y="64" width="304" height="192" rx="16" fill="url(#gBody)" />
            <rect className="neon glow-soft" x="348" y="64" width="304" height="192" rx="16" />
            <rect x="360" y="76" width="280" height="168" rx="10" fill="url(#gScreen)" />
            <rect className="edge" x="360" y="76" width="280" height="168" rx="10" />
            <path d="M360 86 Q360 76 370 76 L452 76 L372 244 L360 244 Z" fill="url(#gSheen)" />
            {/* screen UI */}
            <line className="edge" x1="372" y1="106" x2="628" y2="106" />
            <rect className="fill-neon glow" x="374" y="84" width="16" height="16" rx="4" />
            <circle className="dot" cx="382" cy="92" r="2.3" />
            <line className="ink" x1="400" y1="89" x2="470" y2="89" />
            <line className="ink" x1="400" y1="98" x2="442" y2="98" opacity="0.5" />
            <rect className="fill-neon" x="580" y="85" width="44" height="15" rx="7" />
            <circle className="dot glow" cx="591" cy="92" r="3" />
            <line className="neon" x1="600" y1="92" x2="616" y2="92" strokeWidth="1.4" />
            {SCREEN_ROWS.map((y) => (
              <g key={y}>
                <rect className="edge" x="374" y={y - 15} width="252" height="30" rx="7" fill="rgba(45,212,191,0.045)" />
                <rect className="neon" x="382" y={y - 9} width="18" height="18" rx="3" />
                <line className="ink" x1="410" y1={y - 3} x2="486" y2={y - 3} />
                <line className="ink" x1="410" y1={y + 4} x2="452" y2={y + 4} opacity="0.5" />
                <line className="neon" x1="588" y1={y} x2="620" y2={y} strokeWidth="2.4" />
              </g>
            ))}
            <line className="ink" x1="374" y1="205" x2="408" y2="205" opacity="0.5" />
            <line className="neon-hi glow" x1="374" y1="221" x2="452" y2="221" />
            <g className="ln-complete">
              <rect className="fill-neon glow" x="520" y="206" width="104" height="30" rx="8" />
              <line className="neon" x1="544" y1="221" x2="600" y2="221" strokeWidth="2" />
            </g>

            {/* ── barcode scanner ── */}
            <rect className="body" x="130" y="314" width="86" height="28" rx="9" fill="url(#gBody)" />
            <rect className="neon" x="130" y="314" width="86" height="28" rx="9" opacity="0.45" />
            <line className="neon" x1="146" y1="322" x2="172" y2="322" />
            <rect className="fill-neon glow" x="206" y="320" width="8" height="16" rx="3" />
            <path className="body" d="M158 342 L150 374 H172 L180 342" fill="url(#gBody)" />
            <g className="ln-beam glow-soft">
              <path d="M216 322 L300 314 L300 342 L216 334 Z" fill="url(#gBeam)" />
              <line className="neon" x1="216" y1="322" x2="300" y2="314" opacity="0.6" />
              <line className="neon" x1="216" y1="334" x2="300" y2="342" opacity="0.6" />
            </g>
            <rect className="body" x="300" y="304" width="48" height="46" rx="6" fill="url(#gBody)" />
            <rect className="neon" x="300" y="304" width="48" height="46" rx="6" opacity="0.5" />
            {[308, 313, 319, 326, 331, 337, 342].map((x, i) => (
              <line key={x} className="neon" x1={x} y1="314" x2={x} y2="340" strokeWidth={i % 2 ? 1 : 1.8} opacity="0.85" />
            ))}

            {/* ── thermal printer ── */}
            <rect className="body" x="716" y="288" width="168" height="92" rx="13" fill="url(#gBody)" />
            <rect className="neon glow-soft" x="716" y="288" width="168" height="92" rx="13" opacity="0.5" />
            <rect x="762" y="284" width="76" height="10" rx="4" fill="#050c12" />
            <line className="neon glow" x1="766" y1="289" x2="834" y2="289" opacity="0.7" />
            <rect className="fill-neon" x="732" y="316" width="120" height="7" rx="4" />
            <circle className="dot glow" cx="736" cy="360" r="4" />
            <line className="ink" x1="748" y1="360" x2="788" y2="360" />
            <rect className="edge" x="844" y="352" width="26" height="13" rx="3" />

            {/* ── receipt (feeds up out of the slot) ── */}
            <g className="ln-receipt" clipPath="url(#rcClip)">
              <path className="paper glow-soft" d="M766 286 L774 292 L782 286 L790 292 L798 286 L806 292 L814 286 L822 292 L830 286 L830 142 C830 132 826 126 817 124 L781 119 C771 117 766 123 766 133 Z" />
              <line className="r-ink" x1="778" y1="144" x2="818" y2="144" strokeWidth="2.4" />
              <line className="r-soft" x1="784" y1="152" x2="812" y2="152" />
              <line className="r-soft dash" x1="772" y1="162" x2="824" y2="162" />
              {RECEIPT_ROWS.map((y) => (
                <g key={y}>
                  <line className="r-soft" x1="776" y1={y} x2="808" y2={y} />
                  <line className="r-ink" x1="813" y1={y} x2="824" y2={y} />
                </g>
              ))}
              <line className="r-soft dash" x1="772" y1="212" x2="824" y2="212" />
              <line className="r-ink" x1="776" y1="224" x2="796" y2="224" strokeWidth="2" />
              <line className="r-neon" x1="804" y1="224" x2="824" y2="224" />
              <rect className="r-neon" x="776" y="234" width="48" height="15" rx="3" />
              <path className="r-neon" d="M782 241 L785 244 L790 238" />
              {[776, 781, 786, 792, 797, 803, 808, 814, 820].map((x, i) => (
                <line key={x} className="r-ink" x1={x} y1="258" x2={x} y2="274" strokeWidth={i % 2 ? 1 : 1.8} />
              ))}
            </g>
          </svg>

          <div className="scene-legend">
            <span>{t('labelMonitor')}</span>
            <span className="sep" aria-hidden="true" />
            <span>{t('labelScanner')}</span>
            <span className="sep" aria-hidden="true" />
            <span>{t('labelPrinter')}</span>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
