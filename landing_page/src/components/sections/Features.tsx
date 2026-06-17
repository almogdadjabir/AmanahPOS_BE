import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import SecHead from '@/components/ui/SecHead';
import ScrollReveal from '@/components/ui/ScrollReveal';

const sw = { fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const ICONS: Record<string, ReactNode> = {
  offline: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sw}><path d="M17.5 19a4.5 4.5 0 0 0 .9-8.9A6 6 0 0 0 7 8.5" /><path d="M4 14a4 4 0 0 0 1.5 7.5" opacity=".5" /><path d="m3 3 18 18" /></svg>
  ),
  inventory: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sw}><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5M12 13v8" /></svg>
  ),
  cashier: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sw}><circle cx="9" cy="8" r="3.2" /><path d="M3 20a6 6 0 0 1 12 0" /><circle cx="17.5" cy="9" r="2.4" /><path d="M16.5 14H17a4.5 4.5 0 0 1 4.5 4.5V20" /></svg>
  ),
  pay: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sw}><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20M6 15h4" /></svg>
  ),
  vat: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sw}><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /><path d="m9 13 6 4M15 13l-6 4" /></svg>
  ),
  branch: (
    <svg width="22" height="22" viewBox="0 0 24 24" {...sw}><path d="M3 21V8l6-4 6 4v13" /><path d="M15 21V11l6 4v6M3 21h18" /><path d="M7 11h.01M7 15h.01M11 11h.01M11 15h.01" /></svg>
  ),
};

function Tag({ children }: { children: ReactNode }) {
  return <span className="bt-tag">{children}</span>;
}

export default function Features() {
  const t = useTranslations('feat');

  return (
    <section id="features" className="sec sec-divider feat-screen">
      <div className="container-page">
        <SecHead eyebrow={t('eyebrow')} title={<>{t('h2')} <em>{t('h2Accent')}</em></>} lede={t('sub')} />

        <div className="feat-bento">
          {/* Offline — dark spotlight, wide */}
          <ScrollReveal className="bt bt-5 bt-wide bt-dark" delay={0}>
            <div className="bt-main">
              <span className="bt-ico" aria-hidden="true">{ICONS.offline}</span>
              <h3>{t('f1T')}</h3>
              <p>{t('f1B')}</p>
              <Tag>{t('f1M')}</Tag>
            </div>
            <div className="bt-viz" aria-hidden="true">
              <div className="viz-row muted">
                <span className="vchk">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M12 2v6M12 16v6M2 12h6M16 12h6" /></svg>
                </span>
                <span>{t('vlocal')}</span>
              </div>
              <div className="viz-bar" />
              <div className="viz-row">
                <span className="vchk">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-11" /></svg>
                </span>
                <span>{t('vsynced')}</span>
              </div>
            </div>
          </ScrollReveal>

          {/* Inventory */}
          <ScrollReveal className="bt bt-4" delay={1}>
            <span className="bt-ico" aria-hidden="true">{ICONS.inventory}</span>
            <h3>{t('f2T')}</h3>
            <p>{t('f2B')}</p>
            <Tag>{t('f2M')}</Tag>
          </ScrollReveal>

          {/* Cashier */}
          <ScrollReveal className="bt bt-3" delay={2}>
            <span className="bt-ico" aria-hidden="true">{ICONS.cashier}</span>
            <h3>{t('f3T')}</h3>
            <p>{t('f3B')}</p>
            <Tag>{t('f3M')}</Tag>
          </ScrollReveal>

          {/* Bankak */}
          <ScrollReveal className="bt bt-3" delay={0}>
            <span className="bt-ico" aria-hidden="true">{ICONS.pay}</span>
            <h3>{t('f4T')}</h3>
            <p>{t('f4B')}</p>
            <Tag>{t('f4M')}</Tag>
          </ScrollReveal>

          {/* VAT */}
          <ScrollReveal className="bt bt-4" delay={1}>
            <span className="bt-ico" aria-hidden="true">{ICONS.vat}</span>
            <h3>{t('f5T')}</h3>
            <p>{t('f5B')}</p>
            <Tag>{t('f5M')}</Tag>
          </ScrollReveal>

          {/* Multi-branch — teal, wide */}
          <ScrollReveal className="bt bt-5 bt-wide bt-teal" delay={2}>
            <div className="bt-main">
              <span className="bt-ico" aria-hidden="true">{ICONS.branch}</span>
              <h3>{t('f6T')}</h3>
              <p>{t('f6B')}</p>
              <Tag>{t('f6M')}</Tag>
            </div>
            <div className="bt-viz" aria-hidden="true">
              <svg width="100%" height="84" viewBox="0 0 130 90" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M65 20v18M65 44 38 64M65 44l27 20" opacity=".7" />
                <rect x="53" y="6" width="24" height="16" rx="4" />
                <rect x="22" y="62" width="22" height="15" rx="4" />
                <rect x="54" y="62" width="22" height="15" rx="4" />
                <rect x="86" y="62" width="22" height="15" rx="4" />
              </svg>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
