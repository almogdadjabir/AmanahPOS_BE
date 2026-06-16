import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import SecHead from '@/components/ui/SecHead';
import ScrollReveal from '@/components/ui/ScrollReveal';

const sw = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const ICONS: Record<string, ReactNode> = {
  offline: (
    <svg width="24" height="24" viewBox="0 0 24 24" {...sw}><path d="M17.5 19a4.5 4.5 0 0 0 .9-8.9A6 6 0 0 0 7 8.5" /><path d="M4 14a4 4 0 0 0 1.5 7.5" opacity=".5" /><path d="m3 3 18 18" /></svg>
  ),
  inventory: (
    <svg width="24" height="24" viewBox="0 0 24 24" {...sw}><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5M12 13v8" /></svg>
  ),
  cashier: (
    <svg width="24" height="24" viewBox="0 0 24 24" {...sw}><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><circle cx="17.5" cy="9" r="2.4" /><path d="M16.5 14H17a4.5 4.5 0 0 1 4.5 4.5V20" /></svg>
  ),
  pay: (
    <svg width="24" height="24" viewBox="0 0 24 24" {...sw}><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20M6 15h4" /></svg>
  ),
  vat: (
    <svg width="24" height="24" viewBox="0 0 24 24" {...sw}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="m9 13 6 4M15 13l-6 4" /></svg>
  ),
  branch: (
    <svg width="24" height="24" viewBox="0 0 24 24" {...sw}><path d="M3 21V8l6-4 6 4v13" /><path d="M15 21V11l6 4v6M3 21h18" /><path d="M7 11h.01M7 15h.01M11 11h.01M11 15h.01" /></svg>
  ),
};

export default function Features() {
  const t = useTranslations('feat');

  const cards = [
    { key: 'offline', t: t('f1T'), b: t('f1B'), m: t('f1M') },
    { key: 'inventory', t: t('f2T'), b: t('f2B'), m: t('f2M') },
    { key: 'cashier', t: t('f3T'), b: t('f3B'), m: t('f3M') },
    { key: 'pay', t: t('f4T'), b: t('f4B'), m: t('f4M') },
    { key: 'vat', t: t('f5T'), b: t('f5B'), m: t('f5M') },
    { key: 'branch', t: t('f6T'), b: t('f6B'), m: t('f6M') },
  ];

  return (
    <section id="features" className="sec sec-divider">
      <div className="container-page">
        <SecHead eyebrow={t('eyebrow')} title={<>{t('h2')} <em>{t('h2Accent')}</em></>} lede={t('sub')} />

        <div className="features-grid">
          {cards.map((card, i) => (
            <ScrollReveal key={card.key} className="feature-card" delay={(i % 3) as 0 | 1 | 2}>
              <span className="feature-ico" aria-hidden="true">{ICONS[card.key]}</span>
              <h3>{card.t}</h3>
              <p>{card.b}</p>
              <div className="feature-meta">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M5 12l5 5 9-11" />
                </svg>
                <span className="pill">{card.m}</span>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
