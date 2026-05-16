import { useTranslations } from 'next-intl';
import Logo from '@/components/ui/Logo';

const FONT = "var(--font-nunito), var(--font-geist), system-ui, sans-serif";

export default function Hero() {
  const t  = useTranslations('hero');
  const ts = useTranslations('stat');

  return (
    <section
      style={{
        position: 'relative', overflow: 'hidden', paddingBlock: '64px 96px',
        background: `radial-gradient(1200px 600px at 12% -10%, #F0FDFA 0%, transparent 55%),
                     radial-gradient(900px 500px at 95% 0%, #FEF3C7 0%, transparent 55%),
                     #FFFFFF`,
      }}
    >
      <div
        className="container hero-grid"
        style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 56, alignItems: 'center' }}
      >
        {/* Left: copy */}
        <div>
          {/* Eyebrow */}
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 12px',
            background: '#F0FDFA', color: '#0F766E',
            borderRadius: 999, fontFamily: FONT, fontSize: 12, fontWeight: 800,
            letterSpacing: 0.4, textTransform: 'uppercase',
            border: '1px solid #CCFBF1',
          }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#0F766E' }} />
            {t('eyebrow')}
          </span>

          {/* H1 */}
          <h1 style={{
            margin: '20px 0 0', fontFamily: FONT, fontWeight: 900,
            fontSize: 'clamp(36px, 5.5vw, 60px)', lineHeight: 1.05, letterSpacing: -1.2,
            color: '#0F172A', textWrap: 'balance',
          } as React.CSSProperties}>
            {t('h1a')}{' '}
            <span style={{ color: '#0F766E' }}>{t('h1b')}</span>
            {' '}{t('h1c')}
          </h1>

          {/* Sub */}
          <p style={{
            margin: '20px 0 0', maxWidth: 540, fontFamily: FONT,
            fontSize: 18, fontWeight: 500, lineHeight: 1.55,
            color: '#475569', textWrap: 'pretty',
          } as React.CSSProperties}>
            {t('sub')}
          </p>

          {/* CTAs */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginTop: 32 }}>
            <a
              href="#signup"
              style={{
                fontFamily: FONT, fontWeight: 800, fontSize: 15,
                padding: '14px 24px', borderRadius: 12,
                background: '#0F766E', color: '#fff',
                boxShadow: '0 8px 22px rgba(15,118,110,0.28)',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
                transition: 'transform 180ms cubic-bezier(.2,.85,.3,1)',
              }}
            >
              {t('cta1')}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </a>
            <a
              href="#how"
              style={{
                fontFamily: FONT, fontWeight: 800, fontSize: 15,
                padding: '14px 24px', borderRadius: 12,
                background: '#FFFFFF', color: '#0F172A',
                boxShadow: 'inset 0 0 0 1px #E2E8F0',
                textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
                transition: 'transform 180ms cubic-bezier(.2,.85,.3,1)',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" />
              </svg>
              {t('cta2')}
            </a>
          </div>

          {/* Stats */}
          <div style={{
            marginTop: 40, display: 'flex', gap: 28, flexWrap: 'wrap',
            paddingTop: 28, borderTop: '1px solid #EEF2F6',
          }}>
            {[
              [ts('merchantsV'), ts('merchants')],
              [ts('currency'),   ts('vat')      ],
              [ts('vatV'),       ts('vatL')     ],
              [ts('offlinev'),   ts('offlinel') ],
            ].map(([n, l], i) => (
              <div key={i}>
                <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 22, color: '#0F172A', letterSpacing: -0.4 }}>{n}</div>
                <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 12, color: '#475569', textTransform: 'uppercase', letterSpacing: 0.6 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Phone visual */}
        <PhoneVisual />
      </div>
    </section>
  );
}

function PhoneVisual() {
  return (
    <div style={{ position: 'relative', aspectRatio: '0.95', maxWidth: 520, marginInline: 'auto', width: '100%' }}>
      {/* Floating sale card */}
      <div style={{
        position: 'absolute', top: '6%', left: '-4%', width: 220, padding: 18,
        background: '#FFFFFF', borderRadius: 18, border: '1px solid #EEF2F6',
        boxShadow: '0 30px 60px -20px rgba(15,23,42,0.18)',
        zIndex: 3, transform: 'rotate(-4deg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: '#DCFCE7', color: '#16A34A', display: 'grid', placeItems: 'center' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 800, color: '#0F172A' }}>Sale complete</div>
            <div style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: '#475569' }}>#ORD-2451 · 12:42</div>
          </div>
        </div>
        <div style={{ borderTop: '1px dashed #E2E8F0', paddingTop: 12 }}>
          {[['Cappuccino × 2', '4,400'], ['Karak Tea', '1,200'], ['Croissant', '1,800']].map(([k, v], i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontFamily: FONT, fontSize: 11, fontWeight: 600, color: '#475569', padding: '3px 0' }}>
              <span>{k}</span>
              <span style={{ color: '#0F172A', fontWeight: 700 }}>{v}</span>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10, paddingTop: 10, borderTop: '1px solid #EEF2F6' }}>
            <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 700, color: '#475569' }}>Total</span>
            <span style={{ fontFamily: FONT, fontSize: 18, fontWeight: 900, color: '#0F172A', letterSpacing: -0.4 }}>
              7,400 <span style={{ fontSize: 10, color: '#475569' }}>SDG</span>
            </span>
          </div>
        </div>
      </div>

      {/* Phone frame */}
      <div style={{
        position: 'absolute', inset: 0, marginInline: 'auto',
        width: '62%', aspectRatio: '0.48',
        background: '#0F172A', borderRadius: 44, padding: 8,
        boxShadow: '0 50px 100px -20px rgba(15,23,42,0.35)',
        zIndex: 2,
      }}>
        <div style={{ width: '100%', height: '100%', background: '#F8FAFC', borderRadius: 36, overflow: 'hidden', position: 'relative' }}>
          {/* Phone header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '20px 14px 8px', background: '#FFFFFF', borderBottom: '1px solid #EEF2F6' }}>
            <Logo size={22} />
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontWeight: 900, fontSize: 11, color: '#0F172A' }}>AmanaPOS</div>
              <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 8, color: '#475569' }}>Khartoum · Reg #2</div>
            </div>
          </div>

          {/* Category tabs */}
          <div style={{ display: 'flex', gap: 5, padding: '10px 12px 8px' }}>
            {[['All', '#0F766E', '#fff'], ['Coffee', '#FFFFFF', '#0F172A'], ['Tea', '#FFFFFF', '#0F172A']].map(([l, bg, fg], i) => (
              <div key={i} style={{
                padding: '4px 9px', borderRadius: 999,
                background: bg, color: fg,
                border: `1px solid ${bg === '#FFFFFF' ? '#E2E8F0' : bg}`,
                fontFamily: FONT, fontSize: 9, fontWeight: 800,
              }}>{l}</div>
            ))}
          </div>

          {/* Product grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '4px 12px' }}>
            {[['Cappuccino', '2,200'], ['Karak Tea', '1,200'], ['Croissant', '1,800'], ['Latte', '2,400']].map(([n, p], i) => (
              <div key={i} style={{ background: '#FFFFFF', borderRadius: 10, padding: 6, border: '1px solid #E2E8F0' }}>
                <div style={{ aspectRatio: '1.3', background: 'linear-gradient(135deg, #F1F5F9, #EEF2F6)', borderRadius: 6, marginBottom: 4 }} />
                <div style={{ fontFamily: FONT, fontSize: 8, fontWeight: 800, color: '#0F172A' }}>{n}</div>
                <div style={{ fontFamily: FONT, fontSize: 8, fontWeight: 700, color: '#0F172A', marginTop: 2 }}>
                  {p} <span style={{ fontSize: 6, color: '#94A3B8' }}>SDG</span>
                </div>
              </div>
            ))}
          </div>

          {/* Cart bar */}
          <div style={{
            position: 'absolute', left: 0, right: 0, bottom: 0,
            background: '#FFFFFF', borderRadius: '20px 20px 0 0',
            padding: '10px 14px', boxShadow: '0 -10px 30px rgba(0,0,0,0.08)',
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#CCFBF1', display: 'grid', placeItems: 'center' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <path d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.6L21 7H6" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontFamily: FONT, fontSize: 8, fontWeight: 700, color: '#475569' }}>4 items</div>
              <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 900, color: '#0F172A', letterSpacing: -0.3 }}>
                7,400 <span style={{ fontSize: 7, color: '#475569', fontWeight: 700 }}>SDG</span>
              </div>
            </div>
            <div style={{ padding: '6px 12px', background: '#0F766E', color: '#fff', borderRadius: 8, fontFamily: FONT, fontSize: 9, fontWeight: 900 }}>View cart</div>
          </div>
        </div>
      </div>
    </div>
  );
}
