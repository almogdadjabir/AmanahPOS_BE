import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import SecHead from '@/components/ui/SecHead';
import ScrollReveal from '@/components/ui/ScrollReveal';

const SW = {
  a: 'linear-gradient(135deg, #78350f 0%, #1c1006 100%)',
  b: 'linear-gradient(135deg, #14532d 0%, #052e16 100%)',
  c: 'linear-gradient(135deg, #ca8a04 0%, #422006 100%)',
};

function Clock() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />
    </svg>
  );
}

export default function HowItWorks() {
  const t = useTranslations('how');

  const MINI: ReactNode[] = [
    // 1 — phone sign-up
    <div className="flow-ui" key="signup" aria-hidden="true">
      <span className="fu-cap">{t('uiSignup')}</span>
      <div className="fu-field"><span className="fu-pill">+249</span><span className="fu-line" style={{ flex: 1 }} /></div>
      <div className="fu-otp">
        <span className="fu-box on"><i /></span>
        <span className="fu-box on"><i /></span>
        <span className="fu-box"><i /></span>
        <span className="fu-box"><i /></span>
      </div>
      <div className="fu-btn">{t('uiVerify')}</div>
    </div>,
    // 2 — add products
    <div className="flow-ui" key="products" aria-hidden="true">
      <span className="fu-cap">{t('uiProducts')}</span>
      <div className="fu-row"><span className="fu-thumb" style={{ background: SW.a }} /><span className="fu-line" style={{ flex: 1, maxWidth: 90 }} /><span className="fu-price" /></div>
      <div className="fu-row"><span className="fu-thumb" style={{ background: SW.b }} /><span className="fu-line" style={{ flex: 1, maxWidth: 70 }} /><span className="fu-price" /></div>
      <div className="fu-btn ghost">+ {t('uiAddProduct')}</div>
    </div>,
    // 3 — start selling
    <div className="flow-ui" key="sale" aria-hidden="true">
      <span className="fu-cap">{t('uiSale')}</span>
      <div className="fu-row"><span className="fu-thumb" style={{ background: SW.c }} /><span className="fu-line" style={{ flex: 1, maxWidth: 80 }} /><span className="fu-price" /></div>
      <div className="fu-total"><span className="tl" /><span className="tv" /></div>
      <div className="fu-btn">{t('uiComplete')}</div>
    </div>,
  ];

  const steps = [
    { t: t('s1T'), b: t('s1B'), time: t('t1Time') },
    { t: t('s2T'), b: t('s2B'), time: t('t2Time') },
    { t: t('s3T'), b: t('s3B'), time: t('t3Time') },
  ];

  return (
    <section id="how" className="sec sec-divider how-screen">
      <div className="container-page">
        <SecHead eyebrow={t('eyebrow')} title={<>{t('h2')} <em>{t('h2Accent')}</em></>} lede={t('sub')} />

        <div className="flow">
          {steps.map((step, i) => (
            <ScrollReveal key={i} className="flow-step" delay={(i) as 0 | 1 | 2}>
              <div className="flow-head">
                <span className="flow-num">{i + 1}</span>
                <span className="flow-time"><Clock />{step.time}</span>
              </div>
              {MINI[i]}
              <h3>{step.t}</h3>
              <p>{step.b}</p>
            </ScrollReveal>
          ))}
        </div>
      </div>
    </section>
  );
}
