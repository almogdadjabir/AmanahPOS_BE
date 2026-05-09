import { useTranslations } from 'next-intl';

export default function Pricing() {
  const t = useTranslations('price');

  return (
    <section id="pricing">
      <div className="container-page">
        <div className="section-rail">
          <div className="meta">
            <div className="num">04</div>
            <div className="label">{t('section')}</div>
            <div className="ar-label">{t('sectionAr')}</div>
          </div>

          <div>
            <h2 className="h2">
              {t('h2')} <em>{t('h2Accent')}</em>
            </h2>
            <p className="lede">{t('sub')}</p>

            <div className="price-grid">

              {/* Starter */}
              <div className="plan">
                <div className="plan-head">
                  <span className="name">{t('p1N')}</span>
                </div>
                <div className="plan-price">
                  {t('p1Price')}
                  <span className="per">{t('p1Per')}</span>
                </div>
                <p className="plan-blurb">{t('p1B')}</p>
                <ul className="plan-features">
                  <li>{t('p1F1')}</li>
                  <li>{t('p1F2')}</li>
                  <li>{t('p1F3')}</li>
                  <li>{t('p1F4')}</li>
                </ul>
                <a href="#" className="plan-cta">{t('p1Cta')}</a>
              </div>

              {/* Business - featured */}
              <div className="plan featured">
                <div className="plan-head">
                  <span className="name">{t('p2N')}</span>
                  <span className="badge">{t('popular')}</span>
                </div>
                <div className="plan-price">
                  {t('p2Price')}
                  <span className="per">{t('p2Per')}</span>
                </div>
                <p className="plan-blurb">{t('p2B')}</p>
                <ul className="plan-features">
                  <li>{t('p2F1')}</li>
                  <li>{t('p2F2')}</li>
                  <li>{t('p2F3')}</li>
                  <li>{t('p2F4')}</li>
                  <li>{t('p2F5')}</li>
                  <li>{t('p2F6')}</li>
                </ul>
                <a href="#" className="plan-cta">{t('p2Cta')}</a>
              </div>

              {/* Multi-store */}
              <div className="plan">
                <div className="plan-head">
                  <span className="name">{t('p3N')}</span>
                </div>
                <div className="plan-price">
                  {t('p3Price')}
                  <span className="per">{t('p3Per')}</span>
                </div>
                <p className="plan-blurb">{t('p3B')}</p>
                <ul className="plan-features">
                  <li>{t('p3F1')}</li>
                  <li>{t('p3F2')}</li>
                  <li>{t('p3F3')}</li>
                  <li>{t('p3F4')}</li>
                  <li>{t('p3F5')}</li>
                </ul>
                <a href="#" className="plan-cta">{t('p3Cta')}</a>
              </div>

            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
