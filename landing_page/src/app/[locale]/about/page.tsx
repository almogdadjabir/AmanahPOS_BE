import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Nav from '@/components/sections/Nav';
import Footer from '@/components/sections/Footer';
import type { Metadata } from 'next';
import type { ReactNode } from 'react';

type Props = { params: Promise<{ locale: string }> };

export async function generateStaticParams() {
  return [{ locale: 'en' }, { locale: 'ar' }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return {
    title: locale === 'ar' ? 'عنّا — أمانة بوس' : 'About — AmanaPOS',
    description:
      locale === 'ar'
        ? 'صُنع في الخرطوم للتاجر السوداني'
        : 'Built in Khartoum for Sudanese merchants',
  };
}

// ── Plank icons (12px, stroke) ────────────────────────────

function IcoBubble() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
      <path d="M10.5 1H1.5a.5.5 0 0 0-.5.5V8a.5.5 0 0 0 .5.5h3L1.5 11l3.5-2.5H10.5a.5.5 0 0 0 .5-.5V1.5a.5.5 0 0 0-.5-.5z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IcoLightning() {
  return (
    <svg width="9" height="13" viewBox="0 0 9 13" fill="none" aria-hidden="true">
      <path d="M5.5 1L1 7.5h3.5L3 12l5.5-7H5L5.5 1z" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IcoPin() {
  return (
    <svg width="10" height="13" viewBox="0 0 10 13" fill="none" aria-hidden="true">
      <path d="M5 1C2.8 1 1 2.8 1 5c0 3 4 8 4 8s4-5 4-8c0-2.2-1.8-4-4-4z" stroke="currentColor" strokeWidth="1.1"/>
      <circle cx="5" cy="5" r="1.4" fill="currentColor" opacity="0.8"/>
    </svg>
  );
}

// Arrow for CTA
function IcoArrow() {
  return (
    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
      <path d="M1 5h8M5.5 1.5l3.5 3.5-3.5 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Specification plank ───────────────────────────────────

function Plank({ eye, icon, title, body }: { eye: string; icon: ReactNode; title: string; body: string }) {
  return (
    <div className="ab-plank">
      <div className="ab-plank-eye">
        {icon}
        {eye}
      </div>
      <div>
        <strong className="ab-plank-title">{title}</strong>
        <p className="ab-plank-body">{body}</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────

export default function AboutPage() {
  const t = useTranslations('about');

  return (
    <>
      <div className="bg-layer bg-aurora-1" aria-hidden="true" />
      <div className="bg-layer bg-aurora-2" aria-hidden="true" />
      <div className="bg-layer bg-grid" aria-hidden="true" />
      <div className="bg-layer bg-noise" aria-hidden="true" />

      <Nav />

      <main>

        {/* ── Hero ── claim → proof in one section ── */}
        <section className="ab-hero">
          <div className="container-page">

            {/* Pill chip */}
            <span className="ab-chip">
              <span className="ab-chip-dot" aria-hidden="true" />
              {t('eyebrow')}
            </span>

            {/* Main claim */}
            <h1 className="ab-headline">
              {t('h1')}<br />
              <em>{t('h1Accent')}</em>
            </h1>

            {/* Directional separator — the geometric risk */}
            <span className="ab-sep" aria-hidden="true" />

            {/* Origin story */}
            <p className="ab-lead">{t('intro')}</p>

            {/* Data rail — stats as terminal readout */}
            <div className="ab-rail" role="list">
              <div className="ab-rail-cell" role="listitem">
                <span className="ab-rail-val">{t('stat1V')}</span>
                <span className="ab-rail-lbl">{t('stat1L')}</span>
              </div>
              <div className="ab-rail-cell" role="listitem">
                <span className="ab-rail-val accent">{t('stat2V')}</span>
                <span className="ab-rail-lbl">{t('stat2L')}</span>
              </div>
              <div className="ab-rail-cell" role="listitem">
                <span className="ab-rail-val">{t('stat3V')}</span>
                <span className="ab-rail-lbl">{t('stat3L')}</span>
              </div>
            </div>

          </div>
        </section>

        {/* ── Mission ── single centered statement ── */}
        <section className="ab-mission">
          <div className="container-page">
            <span className="ab-mission-bar" aria-hidden="true" />
            <p className="ab-mission-q">{t('mQ')}</p>
            <p className="ab-mission-sub">{t('mS')}</p>
          </div>
        </section>

        {/* ── Values ── specification planks ── */}
        <section className="ab-values">
          <div className="container-page">
            <Plank eye={t('v1Eye')} icon={<IcoBubble />} title={t('v1T')} body={t('v1B')} />
            <Plank eye={t('v2Eye')} icon={<IcoLightning />} title={t('v2T')} body={t('v2B')} />
            <Plank eye={t('v3Eye')} icon={<IcoPin />} title={t('v3T')} body={t('v3B')} />
          </div>
        </section>

        {/* ── Team ── editorial split ── */}
        <section className="ab-team">
          <div className="container-page">
            <div className="ab-team-grid">

              <div>
                <span className="ab-chip" style={{ marginBottom: 24 }}>
                  <span className="ab-chip-dot" aria-hidden="true" />
                  {t('tEye')}
                </span>
                <h2 className="ab-team-h">{t('tH')}</h2>
                <p className="ab-team-b">{t('tB')}</p>
              </div>

              <div className="ab-join">
                <p className="ab-join-t">{t('jT')}</p>
                <p className="ab-join-b">{t('jB')}</p>
                <Link href="/careers" className="ab-join-cta">
                  {t('jCta')}
                  <IcoArrow />
                </Link>
              </div>

            </div>
          </div>
        </section>

      </main>

      <Footer />
    </>
  );
}
