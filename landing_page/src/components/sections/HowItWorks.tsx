import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import SecHead from '@/components/ui/SecHead';
import ScrollReveal from '@/components/ui/ScrollReveal';

const sw = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const ICONS: ReactNode[] = [
  <svg key="phone" width="22" height="22" viewBox="0 0 24 24" {...sw}><rect x="6" y="2" width="12" height="20" rx="3" /><path d="M11 18h2" /></svg>,
  <svg key="box" width="22" height="22" viewBox="0 0 24 24" {...sw}><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5M12 13v8" /></svg>,
  <svg key="cart" width="22" height="22" viewBox="0 0 24 24" {...sw}><path d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.6L21 7H6" /><circle cx="9" cy="20" r="1.6" /><circle cx="17" cy="20" r="1.6" /></svg>,
];

export default function HowItWorks() {
  const t = useTranslations('how');

  const steps = [
    { t: t('s1T'), b: t('s1B') },
    { t: t('s2T'), b: t('s2B') },
    { t: t('s3T'), b: t('s3B') },
  ];

  return (
    <section id="how" className="sec sec-divider">
      <div className="container-page">
        <SecHead eyebrow={t('eyebrow')} title={<>{t('h2')} <em>{t('h2Accent')}</em></>} lede={t('sub')} />

        <div className="steps">
          {steps.map((step, i) => (
            <ScrollReveal key={i} className="step" delay={(i) as 0 | 1 | 2}>
              <div className="step-head">
                <span className="step-num">{i + 1}</span>
                <span className="step-ico" aria-hidden="true">{ICONS[i]}</span>
              </div>
              <h3>{step.t}</h3>
              <p>{step.b}</p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
