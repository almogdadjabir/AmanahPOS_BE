import { useTranslations } from 'next-intl';
import PosDemo from '@/components/PosDemo';
import FadeIn from '@/components/ui/FadeIn';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || '#';

function Check() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12l5 5 9-11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function Hero() {
  const t = useTranslations('hero');

  const chips = [t('chip1'), t('chip2'), t('chip3'), t('chip4'), t('chip5')];

  return (
    <section className="hero">
      <div className="container-page hero-grid">
        <div className="hero-left">
          <FadeIn>
            <span className="eyebrow hero-eyebrow">
              <span className="dot" aria-hidden="true" />
              {t('eyebrow')}
            </span>
          </FadeIn>

          <FadeIn delay={0.06}>
            <h1 className="hero-h1">
              {t('t1')} <em className="accent-word">{t('t2')}</em> {t('t3')}
            </h1>
          </FadeIn>

          <FadeIn delay={0.12}>
            <p className="hero-sub">{t('sub')}</p>
          </FadeIn>

          <FadeIn delay={0.18}>
            <div className="hero-actions">
              <a href={DASHBOARD_URL} className="btn btn-lg">
                <span>{t('cta1')}</span>
                <span className="arrow" aria-hidden="true">→</span>
              </a>
              <a href="#demo" className="btn btn-ghost btn-lg">
                <span className="play" aria-hidden="true">
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="currentColor">
                    <path d="M3 2l7 4-7 4z" />
                  </svg>
                </span>
                <span>{t('cta2')}</span>
              </a>
            </div>
          </FadeIn>

          <FadeIn delay={0.24}>
            <ul className="trust-chips" aria-label={t('chipsLabel')}>
              {chips.map((chip) => (
                <li key={chip} className="trust-chip">
                  <Check />
                  {chip}
                </li>
              ))}
            </ul>
          </FadeIn>
        </div>

        <FadeIn delay={0.1} className="hero-visual">
          <PosDemo />

          <div className="float-card fc-receipt" aria-hidden="true">
            <span className="fc-ico teal">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3l-2 1.5L15 3l-2 1.5L11 3 9 4.5 7 3z" />
                <path d="M8 8h8M8 12h8M8 16h5" />
              </svg>
            </span>
            <span>
              <span className="fc-t">{t('fcReceiptT')}</span>
              <span className="fc-s">{t('fcReceiptS')}</span>
            </span>
          </div>

          <div className="float-card fc-pay" aria-hidden="true">
            <span className="fc-ico amber">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="20" height="13" rx="2.5" />
                <path d="M2 10h20" />
              </svg>
            </span>
            <span>
              <span className="fc-t">{t('fcPayT')}</span>
              <span className="fc-s">{t('fcPayS')}</span>
            </span>
          </div>

          <div className="float-card fc-offline" aria-hidden="true">
            <span className="fc-dot" />
            <span className="fc-t">{t('fcOfflineT')}</span>
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
