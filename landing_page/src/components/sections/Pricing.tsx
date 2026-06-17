import { useTranslations } from 'next-intl';
import SecHead from '@/components/ui/SecHead';
import ScrollReveal from '@/components/ui/ScrollReveal';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || '#';

function Star() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 2.5l2.6 5.7 6.2.6-4.7 4.1 1.4 6.1L12 15.9l-5.5 3.2 1.4-6.1L3.2 8.8l6.2-.6z" />
    </svg>
  );
}

export default function Pricing() {
  const t = useTranslations('price');

  return (
    <section id="pricing" className="sec sec-divider price-screen">
      <div className="container-page">
        <SecHead eyebrow={t('eyebrow')} title={<>{t('h2')} <em>{t('h2Accent')}</em></>} lede={t('sub')} />

        <ScrollReveal className="price-note" delay={1}>
          <span className="pn-item"><span className="pn-chk" aria-hidden="true" />{t('note1')}</span>
          <span className="pn-item"><span className="pn-chk" aria-hidden="true" />{t('note2')}</span>
          <span className="pn-item"><span className="pn-chk" aria-hidden="true" />{t('note3')}</span>
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
            <span className="plan-ribbon"><Star />{t('popular')}</span>
            <div className="plan-head">
              <span className="name">{t('p2N')}</span>
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
