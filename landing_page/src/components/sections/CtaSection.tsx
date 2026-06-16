import { useTranslations } from 'next-intl';
import ScrollReveal from '@/components/ui/ScrollReveal';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || '#';

export default function CtaSection() {
  const t = useTranslations('cta');

  return (
    <section className="cta-section">
      <div className="container-page">
        <ScrollReveal className="cta-strip">
          <h2>
            {t('h1')} <em>{t('h2')}</em> {t('h3')}
          </h2>
          <p className="cta-sub">{t('sub')}</p>
          <div className="actions">
            <a href={DASHBOARD_URL} className="btn btn-lg">
              <span>{t('b1')}</span>
              <span className="arrow" aria-hidden="true">→</span>
            </a>
            <a href="#" className="btn btn-ghost btn-lg">
              <span>{t('b2')}</span>
            </a>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
