import { useTranslations } from 'next-intl';
import SecHead from '@/components/ui/SecHead';
import ScrollReveal from '@/components/ui/ScrollReveal';

export default function DemoSection() {
  const t = useTranslations('demo');
  const sdg = t('sdg');

  return (
    <section id="demo" className="sec sec-divider">
      <div className="container-page">
        <SecHead eyebrow={t('eyebrow')} title={<>{t('h2')} <em>{t('h2Accent')}</em></>} lede={t('sub')} />

        <div className="demo-grid">
          {/* Step 1 — choose products */}
          <ScrollReveal className="demo-card" delay={0}>
            <div className="demo-mock">
              <span className="dm-badge" aria-hidden="true"><span className="d" />{t('itemsBadge')}</span>
              <div className="dm-tiles" aria-hidden="true">
                <div className="dm-tile sel"><span className="dm-swatch sw-fish" /><span className="dm-line t sm" /></div>
                <div className="dm-tile"><span className="dm-swatch sw-salad" /><span className="dm-line sm" /></div>
                <div className="dm-tile sel"><span className="dm-swatch sw-ful" /><span className="dm-line t sm" /></div>
                <div className="dm-tile"><span className="dm-swatch sw-tea" /><span className="dm-line sm" /></div>
              </div>
            </div>
            <div className="demo-cap">
              <span className="demo-step-n">1</span>
              <h3>{t('d1T')}</h3>
              <p>{t('d1B')}</p>
            </div>
          </ScrollReveal>

          {/* Step 2 — take payment */}
          <ScrollReveal className="demo-card" delay={1}>
            <div className="demo-mock" aria-hidden="true">
              <div className="dm-pay sel">
                <span className="pico">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="5" width="20" height="14" rx="2.5" /><path d="M2 10h20" /></svg>
                </span>
                <span>
                  <span className="pt">{t('bankak')}</span>
                  <span className="ps">{t('bankakSub')}</span>
                </span>
                <span className="pamt">{t('totalVal')}</span>
              </div>
              <div className="dm-pay">
                <span className="pico">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.4" /></svg>
                </span>
                <span>
                  <span className="pt">{t('cash')}</span>
                  <span className="ps">{t('cashSub')}</span>
                </span>
              </div>
            </div>
            <div className="demo-cap">
              <span className="demo-step-n">2</span>
              <h3>{t('d2T')}</h3>
              <p>{t('d2B')}</p>
            </div>
          </ScrollReveal>

          {/* Step 3 — receipt + offline sync */}
          <ScrollReveal className="demo-card" delay={2}>
            <div className="demo-mock" aria-hidden="true">
              <span className="dm-badge synced"><span className="d" />{t('savedOffline')}</span>
              <div className="dm-receipt">
                <div className="dm-rrow"><span className="dm-line" /><span className="amt">{t('r1')}</span></div>
                <div className="dm-rrow"><span className="dm-line" /><span className="amt">{t('r2')}</span></div>
                <div className="dm-rrow"><span className="dm-line" /><span className="amt">{t('r3')}</span></div>
                <div className="dm-rtotal">
                  <span className="l">{t('total')}</span>
                  <span className="v">{t('totalVal')} {sdg}</span>
                </div>
              </div>
            </div>
            <div className="demo-cap">
              <span className="demo-step-n">3</span>
              <h3>{t('d3T')}</h3>
              <p>{t('d3B')}</p>
            </div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
}
