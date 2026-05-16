import { useTranslations } from 'next-intl';

const FONT = "var(--font-nunito), var(--font-geist), system-ui, sans-serif";

export default function Pricing() {
  const t = useTranslations('price');

  const plans = [
    {
      name: t('p1N'), price: t('p1Price'), period: t('p1Per'), blurb: t('p1B'),
      features: [t('p1F1'), t('p1F2'), t('p1F3'), t('p1F4')],
      cta: t('p1Cta'), primary: false, badge: null,
    },
    {
      name: t('p2N'), price: t('p2Price'), period: t('p2Per'), blurb: t('p2B'),
      features: [t('p2F1'), t('p2F2'), t('p2F3'), t('p2F4'), t('p2F5'), t('p2F6')],
      cta: t('p2Cta'), primary: true, badge: t('popular'),
    },
    {
      name: t('p3N'), price: t('p3Price'), period: t('p3Per'), blurb: t('p3B'),
      features: [t('p3F1'), t('p3F2'), t('p3F3'), t('p3F4'), t('p3F5')],
      cta: t('p3Cta'), primary: false, badge: null,
    },
  ];

  return (
    <section id="pricing" style={{ paddingBlock: 96, background: '#FFFFFF' }}>
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

        {/* Plans grid */}
        <div className="pricing-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20, alignItems: 'start' }}>
          {plans.map((p, i) => (
            <div
              key={i}
              style={{
                position: 'relative', padding: 32,
                background: p.primary ? '#0B1220' : '#FFFFFF',
                color: p.primary ? '#F8FAFC' : '#0F172A',
                borderRadius: 22,
                border: p.primary ? '1px solid rgba(255,255,255,0.1)' : '1px solid #EEF2F6',
                boxShadow: p.primary ? '0 30px 60px -20px rgba(15,23,42,0.3)' : 'none',
                transform: p.primary ? 'translateY(-12px)' : 'none',
              }}
            >
              {p.badge && (
                <div style={{
                  position: 'absolute', top: -14, left: '50%', transform: 'translateX(-50%)',
                  padding: '6px 14px', background: '#F59E0B', color: '#0B1220',
                  borderRadius: 999, fontFamily: FONT, fontSize: 11, fontWeight: 900,
                  letterSpacing: 0.6, textTransform: 'uppercase',
                  boxShadow: '0 8px 16px -4px rgba(245,158,11,0.4)', whiteSpace: 'nowrap',
                }}>
                  {p.badge}
                </div>
              )}

              <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 14, color: p.primary ? 'rgba(248,250,252,0.65)' : '#475569', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                {p.name}
              </div>

              <div style={{ marginTop: 12, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 44, letterSpacing: -1.5 }}>{p.price}</span>
                <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 13, color: p.primary ? 'rgba(248,250,252,0.65)' : '#475569' }}>{p.period}</span>
              </div>

              <p style={{ margin: '12px 0 0', fontFamily: FONT, fontSize: 14, fontWeight: 500, lineHeight: 1.55, color: p.primary ? 'rgba(248,250,252,0.65)' : '#475569' }}>
                {p.blurb}
              </p>

              <div style={{ marginTop: 20, marginBottom: 20, height: 1, background: p.primary ? 'rgba(255,255,255,0.1)' : '#EEF2F6' }} />

              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {p.features.map((f, j) => (
                  <li key={j} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontFamily: FONT, fontSize: 14, fontWeight: 600, color: p.primary ? '#F8FAFC' : '#0F172A' }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
                      <circle cx="12" cy="12" r="10" fill={p.primary ? 'rgba(15,118,110,0.3)' : '#CCFBF1'} />
                      <path d="m8 12 3 3 5-6" stroke={p.primary ? '#fff' : '#0F766E'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>

              <div style={{ marginTop: 24 }}>
                <a
                  href="#signup"
                  style={{
                    display: 'flex', justifyContent: 'center',
                    fontFamily: FONT, fontWeight: 800, fontSize: 15,
                    padding: '14px 24px', borderRadius: 12, textDecoration: 'none',
                    ...(p.primary
                      ? { background: '#0F766E', color: '#fff', boxShadow: '0 8px 22px rgba(15,118,110,0.35)' }
                      : { background: '#FFFFFF', color: '#0F172A', boxShadow: 'inset 0 0 0 1px #E2E8F0' }),
                    transition: 'transform 180ms cubic-bezier(.2,.85,.3,1)',
                  }}
                >
                  {p.cta}
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
