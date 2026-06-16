import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import SecHead from '@/components/ui/SecHead';
import ScrollReveal from '@/components/ui/ScrollReveal';

const sw = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const ICONS: Record<string, ReactNode> = {
  wifi: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sw}><path d="M2 8.5a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M8.5 15.5a6 6 0 0 1 7 0" /><circle cx="12" cy="19" r="0.6" fill="currentColor" /><path d="m3 3 18 18" /></svg>
  ),
  power: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sw}><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
  ),
  box: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sw}><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5M12 13v8" /></svg>
  ),
  cash: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sw}><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /></svg>
  ),
  receipt: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sw}><path d="M5 3v18l2-1.5L9 21l2-1.5L13 21l2-1.5L17 21l2-1.5V3l-2 1.5L15 3l-2 1.5L11 3 9 4.5 7 3z" /><path d="M8 8h8M8 12h6" /></svg>
  ),
  chart: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sw}><path d="M3 3v18h18" /><path d="M7 14v3M12 9v8M17 5v12" /></svg>
  ),
};

export default function ProblemSection() {
  const t = useTranslations('problem');

  const items = [
    { key: 'wifi', t: t('p1T'), b: t('p1B') },
    { key: 'power', t: t('p2T'), b: t('p2B') },
    { key: 'box', t: t('p3T'), b: t('p3B') },
    { key: 'cash', t: t('p4T'), b: t('p4B') },
    { key: 'receipt', t: t('p5T'), b: t('p5B') },
    { key: 'chart', t: t('p6T'), b: t('p6B') },
  ];

  return (
    <section id="why" className="sec sec-divider">
      <div className="container-page">
        <SecHead eyebrow={t('eyebrow')} title={<>{t('h2')} <em>{t('h2Accent')}</em></>} lede={t('sub')} />

        <div className="problem-grid">
          {items.map((item, i) => (
            <ScrollReveal key={item.key} className="problem-card" delay={(i % 3) as 0 | 1 | 2}>
              <span className="problem-ico" aria-hidden="true">{ICONS[item.key]}</span>
              <span>
                <span className="pc-t">{item.t}</span>
                <p className="pc-b">{item.b}</p>
              </span>
            </ScrollReveal>
          ))}
        </div>

        <ScrollReveal className="problem-solution">
          <span className="ps-ico" aria-hidden="true">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2 4 5v6c0 5 3.4 8.4 8 9.5 4.6-1.1 8-4.5 8-9.5V5z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </span>
          <p>{t('solution')}</p>
        </ScrollReveal>
      </div>
    </section>
  );
}
