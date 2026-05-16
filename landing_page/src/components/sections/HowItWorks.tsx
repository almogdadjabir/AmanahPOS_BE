import { useTranslations } from 'next-intl';

const FONT = "var(--font-nunito), var(--font-geist), system-ui, sans-serif";

export default function HowItWorks() {
  const t = useTranslations('how');

  const steps = [
    { n: '01', title: t('s1T'), desc: t('s1B') },
    { n: '02', title: t('s2T'), desc: t('s2B') },
    { n: '03', title: t('s3T'), desc: t('s3B') },
  ];

  return (
    <section id="how" style={{ paddingBlock: 96, background: '#FFFFFF' }}>
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

        {/* Steps grid */}
        <div className="how-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, position: 'relative' }}>
          {steps.map((s, i) => (
            <div
              key={i}
              style={{
                position: 'relative', padding: 32,
                background: '#FFFFFF', borderRadius: 18,
                border: '1px solid #EEF2F6',
              }}
            >
              <div style={{
                fontFamily: FONT, fontSize: 56, fontWeight: 900,
                color: '#CCFBF1', lineHeight: 1, letterSpacing: -2, marginBottom: 12,
              }}>
                {s.n}
              </div>
              <h3 style={{ margin: 0, fontFamily: FONT, fontWeight: 900, fontSize: 20, color: '#0F172A', letterSpacing: -0.4 }}>
                {s.title}
              </h3>
              <p style={{ margin: '8px 0 0', fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.6, color: '#475569' }}>
                {s.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
