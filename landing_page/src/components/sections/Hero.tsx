import { useTranslations } from 'next-intl';
import PosDemo from '@/components/PosDemo';

export default function Hero() {
  const t = useTranslations('hero');
  const s = useTranslations('stat');

  return (
    <section className="hero">
      <div className="container-page hero-grid">
        <div className="hero-left">
          <div>
            <div className="hero-eyebrow">
              <span className="pulse" aria-hidden="true" />
              <span className="eyebrow">{t('eyebrow')}</span>
            </div>

            <h1 className="hero-h1">
              {t('t1')}{' '}
              <em className="accent-word">{t('t2')}</em>
              {t('t3')}
            </h1>

            <p className="hero-sub">{t('sub')}</p>

            <div className="hero-actions">
              <a href="#" className="btn">
                <span>{t('cta1')}</span>
                <span className="arrow" aria-hidden="true">→</span>
              </a>
              <a href="#how" className="btn btn-ghost">
                <span>{t('cta2')}</span>
              </a>
            </div>
          </div>

          <div className="hero-foot">
            <div className="stat">
              <div className="v accent">{s('merchantsV')}</div>
              <div className="l">{s('merchants')}</div>
            </div>
            <div className="stat">
              <div className="v">{s('currency')}</div>
              <div className="l">{s('vat')}</div>
            </div>
            <div className="stat">
              <div className="v accent">{s('offlinev')}</div>
              <div className="l">{s('offlinel')}</div>
            </div>
          </div>
        </div>

        <PosDemo />
      </div>
    </section>
  );
}
