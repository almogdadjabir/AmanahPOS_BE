import { useTranslations } from 'next-intl';
import SecHead from '@/components/ui/SecHead';
import ScrollReveal from '@/components/ui/ScrollReveal';

// Telemetry signal: steady line that dips hard at two disruptions, then recovers — never flatlines.
const SIGNAL_PATH =
  'M0,56 C60,52 110,50 160,53 C210,56 252,58 286,55 L299,55 L308,116 L318,55 ' +
  'C342,51 374,49 412,52 C472,56 522,58 582,55 L600,55 L610,121 L622,55 ' +
  'C662,51 722,49 788,53 C852,56 922,54 1000,54';

function NodeCheck() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12l5 5 9-11" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export default function ProblemSection() {
  const t = useTranslations('problem');

  const conditions = [
    { t: t('p1T'), b: t('p1B') },
    { t: t('p2T'), b: t('p2B') },
    { t: t('p3T'), b: t('p3B') },
    { t: t('p4T'), b: t('p4B') },
    { t: t('p5T'), b: t('p5B') },
    { t: t('p6T'), b: t('p6B') },
  ];

  return (
    <section id="why" className="sec sec-divider">
      <div className="container-page">
        <SecHead eyebrow={t('eyebrow')} title={<>{t('h2')} <em>{t('h2Accent')}</em></>} lede={t('sub')} />

        <ScrollReveal className="cond-panel">
          <div className="cond-head">
            <span className="cond-live"><i aria-hidden="true" />{t('console')}</span>
            <span className="cond-status">
              <i aria-hidden="true" />
              {t('statusLabel')}<b>{t('statusValue')}</b>
            </span>
          </div>

          <div className="cond-wave" role="img" aria-label={t('waveAlt')}>
            <svg viewBox="0 0 1000 130" preserveAspectRatio="none" aria-hidden="true">
              <line className="sig-base" x1="0" y1="55" x2="1000" y2="55" />
              <path className="sig-line" pathLength={1} d={SIGNAL_PATH} />
            </svg>
            <span className="wave-scan" aria-hidden="true" />
            <span className="wave-pin" style={{ left: '30.6%' }} aria-hidden="true">
              <span className="pin-tag">{t('netDrop')}</span>
              <span className="pin-stem" />
            </span>
            <span className="wave-pin" style={{ left: '61%' }} aria-hidden="true">
              <span className="pin-tag">{t('powerCut')}</span>
              <span className="pin-stem" />
            </span>
          </div>

          <ul className="cond-list">
            {conditions.map((c, i) => (
              <li className="cond-row" key={i}>
                <span className="cond-node" aria-hidden="true"><NodeCheck /></span>
                <span>
                  <span className="cond-name">{c.t}</span>
                  <span className="cond-resp">{c.b}</span>
                </span>
              </li>
            ))}
          </ul>

          <div className="cond-readout">
            <span className="ro-mark" aria-hidden="true">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2 4 5v6c0 5 3.4 8.4 8 9.5 4.6-1.1 8-4.5 8-9.5V5z" />
                <path d="m9 12 2 2 4-4" />
              </svg>
            </span>
            <p>{t('solution')}</p>
          </div>
        </ScrollReveal>
      </div>
    </section>
  );
}
