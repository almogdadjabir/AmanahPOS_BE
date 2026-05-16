import { useTranslations } from 'next-intl';

const FONT = "var(--font-nunito), var(--font-geist), system-ui, sans-serif";

const ICONS = [
  // 1. Checkout
  <path key="1" d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.6L21 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />,
  // 2. Inventory
  <>
    <path key="2a" d="m12 2 10 5v10l-10 5L2 17V7l10-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path key="2b" d="m2 7 10 5 10-5M12 12v10" stroke="currentColor" strokeWidth="2" />
  </>,
  // 3. Reports
  <>
    <path key="3a" d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path key="3b" d="M7 14l4-4 3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  // 4. Staff
  <>
    <circle key="4a" cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
    <path key="4b" d="M3 20a6 6 0 0 1 12 0M16 11l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </>,
  // 5. Offline
  <>
    <path key="5a" d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle key="5b" cx="12" cy="19.5" r="1.5" fill="currentColor" />
  </>,
  // 6. SDG
  <>
    <rect key="6a" x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
    <path key="6b" d="M3 11h18M7 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </>,
];

const COLORS = [
  { tint: '#0F766E', bg: '#CCFBF1' },
  { tint: '#0EA5E9', bg: '#E0F2FE' },
  { tint: '#16A34A', bg: '#DCFCE7' },
  { tint: '#DB2777', bg: '#FCE7F3' },
  { tint: '#F59E0B', bg: '#FEF3C7' },
  { tint: '#2563EB', bg: '#DBEAFE' },
];

export default function Features() {
  const t = useTranslations('feat');

  const cards = [
    { title: t('g1T'), desc: t('g1B') },
    { title: t('g2T'), desc: t('g2B') },
    { title: t('g3T'), desc: t('g3B') },
    { title: t('g4T'), desc: t('g4B') },
    { title: t('g5T'), desc: t('g5B') },
    { title: t('g6T'), desc: t('g6B') },
  ];

  return (
    <section id="features" style={{ paddingBlock: 96, background: '#F8FAFC', borderBlock: '1px solid #EEF2F6' }}>
      <div className="container">
        {/* Section head */}
        <div style={{ maxWidth: 720, marginInline: 'auto', textAlign: 'center', marginBottom: 56 }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px',
            background: '#F0FDFA', color: '#0F766E', borderRadius: 999,
            fontFamily: FONT, fontSize: 12, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase',
            border: '1px solid #CCFBF1',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0F766E' }} />
            {t('kicker')}
          </span>
          <h2 style={{
            margin: '16px 0 0', fontFamily: FONT, fontWeight: 900,
            fontSize: 'clamp(28px, 3.5vw, 44px)', lineHeight: 1.1, letterSpacing: -0.8,
            color: '#0F172A', textWrap: 'balance',
          } as React.CSSProperties}>
            {t('h2')} <span style={{ color: '#0F766E' }}>{t('h2b')}</span>
          </h2>
          <p style={{
            margin: '14px 0 0', fontFamily: FONT, fontSize: 17, fontWeight: 500, lineHeight: 1.55,
            color: '#475569', textWrap: 'pretty',
          } as React.CSSProperties}>
            {t('sub')}
          </p>
        </div>

        {/* 6-card grid */}
        <div
          className="feat-grid"
          style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 18 }}
        >
          {cards.map((card, i) => (
            <FeatureCard key={i} {...card} icon={ICONS[i]} color={COLORS[i]} />
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({
  title, desc, icon, color,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  color: { tint: string; bg: string };
}) {
  return (
    <div
      style={{
        padding: 28, background: '#FFFFFF', borderRadius: 18,
        border: '1px solid #EEF2F6',
        transition: 'all 200ms cubic-bezier(.2,.85,.3,1)',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(-4px)';
        el.style.boxShadow = '0 24px 40px -20px rgba(15,23,42,0.16)';
        el.style.borderColor = '#E2E8F0';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = 'none';
        el.style.borderColor = '#EEF2F6';
      }}
    >
      <div style={{
        width: 48, height: 48, borderRadius: 14,
        background: color.bg, color: color.tint,
        display: 'grid', placeItems: 'center', marginBottom: 18,
      }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">{icon}</svg>
      </div>
      <h3 style={{ margin: '0 0 8px', fontFamily: FONT, fontWeight: 900, fontSize: 18, color: '#0F172A', letterSpacing: -0.3 }}>
        {title}
      </h3>
      <p style={{ margin: 0, fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: '#475569', textWrap: 'pretty' } as React.CSSProperties}>
        {desc}
      </p>
    </div>
  );
}
