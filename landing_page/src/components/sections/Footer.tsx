import { useTranslations } from 'next-intl';
import Logo from '@/components/ui/Logo';

const FONT = "var(--font-nunito), var(--font-geist), system-ui, sans-serif";

export default function Footer() {
  const t = useTranslations('foot');

  const cols = [
    { title: t('c1'), links: [{ label: t('c1a'), href: '#features' }, { label: t('c1b'), href: '#pricing' }, { label: t('c1c'), href: '#' }, { label: t('c1d'), href: '#download' }] },
    { title: t('c2'), links: [{ label: t('c2a'), href: '#' }, { label: t('c2b'), href: '#' }, { label: t('c2c'), href: '#' }, { label: t('c2d'), href: '#' }] },
    { title: t('c3'), links: [{ label: t('c3a'), href: '#' }, { label: t('c3b'), href: '#' }, { label: t('c3c'), href: '#' }, { label: t('c3d'), href: '#' }] },
    { title: t('c4'), links: [{ label: t('c4a'), href: '#' }, { label: t('c4b'), href: '#' }, { label: t('c4c'), href: '#' }, { label: t('c4d'), href: '#' }] },
  ];

  return (
    <footer style={{ background: '#0B1220', color: 'rgba(248,250,252,0.65)', paddingBlock: '64px 32px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="container">
        <div
          className="foot-grid"
          style={{ display: 'grid', gridTemplateColumns: '1.5fr repeat(4, 1fr)', gap: 32, marginBottom: 48 }}
        >
          {/* Brand column */}
          <div>
            <a href="#" style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#F8FAFC', textDecoration: 'none', marginBottom: 14 }}>
              <Logo size={32} />
              <span style={{ fontFamily: FONT, fontWeight: 900, fontSize: 18, letterSpacing: -0.4 }}>AmanaPOS</span>
            </a>
            <p style={{ margin: 0, maxWidth: 280, fontFamily: FONT, fontSize: 13.5, lineHeight: 1.6 }}>
              {t('tag')}
            </p>
          </div>

          {/* Link columns */}
          {cols.map((col, i) => (
            <div key={i}>
              <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 12, color: '#F8FAFC', textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 14 }}>
                {col.title}
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                {col.links.map((link, j) => (
                  <li key={j}>
                    <a
                      href={link.href}
                      style={{ fontFamily: FONT, fontSize: 14, fontWeight: 600, color: 'rgba(248,250,252,0.65)', textDecoration: 'none', transition: 'color 140ms' }}
                      onMouseEnter={e => (e.currentTarget.style.color = '#F8FAFC')}
                      onMouseLeave={e => (e.currentTarget.style.color = 'rgba(248,250,252,0.65)')}
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          paddingTop: 24, borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
        }}>
          <div style={{ fontFamily: FONT, fontSize: 13, fontWeight: 600 }}>{t('copy')}</div>
          <div style={{ display: 'flex', gap: 14 }}>
            {['T', 'F', 'I'].map((s, i) => (
              <a
                key={i}
                href="#"
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'rgba(255,255,255,0.06)',
                  display: 'grid', placeItems: 'center',
                  color: 'rgba(248,250,252,0.65)', textDecoration: 'none',
                  transition: 'background 140ms',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.12)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
              >
                <span style={{ fontFamily: FONT, fontSize: 11, fontWeight: 800 }}>{s}</span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
