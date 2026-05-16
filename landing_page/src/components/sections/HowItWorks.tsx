import { useTranslations } from 'next-intl';

export default function HowItWorks() {
  const t = useTranslations('how');

  return (
    <section id="how">
      <div className="container-page">
        <div className="section-rail">
          <div className="meta">
            <div className="num">03</div>
            <div className="label">{t('section')}</div>
            <div className="ar-label">{t('sectionAr')}</div>
          </div>

          <div>
            <h2 className="h2">
              {t('h2')} <em>{t('h2Accent')}</em>
            </h2>
            <p className="lede">{t('sub')}</p>

            <div className="steps">
              <div className="step">
                <div className="step-num">١</div>
                <h3>{t('s1T')}</h3>
                <p>{t('s1B')}</p>
              </div>
              <div className="step">
                <div className="step-num">٢</div>
                <h3>{t('s2T')}</h3>
                <p>{t('s2B')}</p>
              </div>
              <div className="step">
                <div className="step-num">٣</div>
                <h3>{t('s3T')}</h3>
                <p>{t('s3B')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
