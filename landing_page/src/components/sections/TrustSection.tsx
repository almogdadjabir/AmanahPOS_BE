import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import SecHead from '@/components/ui/SecHead';
import ScrollReveal from '@/components/ui/ScrollReveal';

const sw = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const ICONS: ReactNode[] = [
  <svg key="shield" width="24" height="24" viewBox="0 0 24 24" {...sw}><path d="M12 2 4 5v6c0 5 3.4 8.4 8 9.5 4.6-1.1 8-4.5 8-9.5V5z" /><path d="m9 12 2 2 4-4" /></svg>,
  <svg key="flag" width="24" height="24" viewBox="0 0 24 24" {...sw}><path d="M5 21V4" /><path d="M5 4h13l-2.5 4L18 12H5" /></svg>,
  <svg key="smile" width="24" height="24" viewBox="0 0 24 24" {...sw}><circle cx="12" cy="12" r="9" /><path d="M8.5 14.5a4.5 4.5 0 0 0 7 0" /><path d="M9 9.5h.01M15 9.5h.01" /></svg>,
];

export default function TrustSection() {
  const t = useTranslations('trust');

  const cards = [
    { t: t('t1T'), b: t('t1B') },
    { t: t('t2T'), b: t('t2B') },
    { t: t('t3T'), b: t('t3B') },
  ];

  return (
    <section id="trust" className="sec sec-divider">
      <div className="container-page">
        <SecHead eyebrow={t('eyebrow')} title={<>{t('h2')} <em>{t('h2Accent')}</em></>} lede={t('sub')} />

        <div className="trust-grid">
          {cards.map((card, i) => (
            <ScrollReveal key={i} className="trust-card" delay={(i) as 0 | 1 | 2}>
              <span className="trust-ico" aria-hidden="true">{ICONS[i]}</span>
              <h3>{card.t}</h3>
              <p>{card.b}</p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
