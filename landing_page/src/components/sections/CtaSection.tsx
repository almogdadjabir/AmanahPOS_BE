import { useTranslations } from 'next-intl';

export default function CtaSection() {
  const t = useTranslations('cta');

  return (
    <section>
      <div className="cta-strip">
        <div className="container-page">
          <h2>
            {t('h1')} <em>{t('h2')}</em> {t('h3')}
          </h2>
          <div className="actions">
            <a href="#" className="btn">
              <span>{t('b1')}</span>
              <span className="arrow" aria-hidden="true">→</span>
            </a>
            <a href="#" className="btn btn-ghost">
              <span>{t('b2')}</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
