import { useTranslations } from 'next-intl';
import SecHead from '@/components/ui/SecHead';
import ScrollReveal from '@/components/ui/ScrollReveal';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || '#';

export default function Pricing() {
  const t = useTranslations('price');

  return (
    <section id="pricing" className="sec sec-divider">
      <div className="container-page">
        <SecHead eyebrow={t('eyebrow')} title={<>{t('h2')} <em>{t('h2Accent')}</em></>} lede={t('sub')} />

        <ScrollReveal className="sec-head" delay={1}>
          <span className="price-note">
            {t('note1')}<span className="sep" aria-hidden="true" />
            {t('note2')}<span className="sep" aria-hidden="true" />
            {t('note3')}
          </span>
        </ScrollReveal>

        <div className="price-grid">
          {/* Starter */}
          <ScrollReveal className="plan" delay={0}>
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
            <a href={DASHBOARD_URL} className="plan-cta">{t('p1Cta')}</a>
          </ScrollReveal>

          {/* Business — featured */}
          <ScrollReveal className="plan featured" delay={1}>
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
            <a href={DASHBOARD_URL} className="plan-cta">{t('p2Cta')}</a>
          </ScrollReveal>

          {/* Multi-store */}
          <ScrollReveal className="plan" delay={2}>
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
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
