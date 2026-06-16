import { useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { ComponentProps, ReactNode } from 'react';

// ── Icon components ──────────────────────────────────────

function IcoGrid() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="7.5" y="1" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="1" y="7.5" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.2"/>
      <rect x="7.5" y="7.5" width="4.5" height="4.5" rx="0.8" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}

function IcoCoin() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M6.5 3.5v6M4.5 5c0-.8.9-1.5 2-1.5s2 .7 2 1.5S8.5 6.5 6.5 6.5s-2 .7-2 1.5S5.4 9.5 6.5 9.5s2-.7 2-1.5" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
    </svg>
  );
}

function IcoList() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <circle cx="2" cy="2.5" r="0.9" fill="currentColor"/>
      <circle cx="2" cy="6.5" r="0.9" fill="currentColor"/>
      <circle cx="2" cy="10.5" r="0.9" fill="currentColor"/>
      <path d="M5 2.5h6M5 6.5h6M5 10.5h4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IcoDownload() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M6.5 1v7.5M4 6.5l2.5 2.5 2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M1.5 11h10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IcoPerson() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="3.8" r="2.3" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1.5 12c0-2.761 2.239-4.7 5-4.7s5 1.939 5 4.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IcoUsers() {
  return (
    <svg width="15" height="13" viewBox="0 0 15 13" fill="none" aria-hidden="true">
      <circle cx="5.5" cy="3.8" r="2.3" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1 12c0-2.761 2.015-4.7 4.5-4.7S10 9.239 10 12" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="11" cy="3.8" r="2.3" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M10 9.5c.3-.2.65-.2 1-.2 2.485 0 3.5 1.939 3.5 4.7" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IcoMail() {
  return (
    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M1 3l6 4 6-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IcoBriefcase() {
  return (
    <svg width="14" height="13" viewBox="0 0 14 13" fill="none" aria-hidden="true">
      <rect x="1" y="4.5" width="12" height="8" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M4.5 4.5V3A1.5 1.5 0 0 1 6 1.5h2A1.5 1.5 0 0 1 9.5 3v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <path d="M1 8.5h12" stroke="currentColor" strokeWidth="1.2"/>
    </svg>
  );
}

function IcoQuestion() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <circle cx="6.5" cy="6.5" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M4.5 5.2C4.5 4.2 5.4 3.5 6.5 3.5s2 .7 2 1.7c0 1.3-2 1.3-2 2.8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
      <circle cx="6.5" cy="9.5" r="0.7" fill="currentColor"/>
    </svg>
  );
}

function IcoBook() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="10" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M3.5 4.5h5M3.5 7h5M3.5 9.5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
    </svg>
  );
}

function IcoPulse() {
  return (
    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
      <path d="M1 5h2.5l2-4 2.5 8L10 5h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IcoShield() {
  return (
    <svg width="12" height="14" viewBox="0 0 12 14" fill="none" aria-hidden="true">
      <path d="M6 1L1 3.5v4C1 10.5 3.2 12.8 6 13.5c2.8-.7 5-3 5-6v-4L6 1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
      <path d="M3.5 7L5 8.5 8.5 5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Social icons ──────────────────────────────────────────

function IcoLinkedIn() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="13" height="13" rx="3" stroke="currentColor" strokeWidth="1.15"/>
      <circle cx="4.8" cy="5.2" r="0.85" fill="currentColor"/>
      <path d="M4.3 7v4M7.5 11V8.5a2 2 0 0 1 4 0V11M7.5 7v4" stroke="currentColor" strokeWidth="1.15" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function IcoX() {
  return (
    <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
      <path d="M2 2l3.8 4.8L2 11h1.3l3-3.7 2.5 3.7H11L7 6.2 11 2H9.7L6.7 5.4 4.3 2H2z" fill="currentColor"/>
    </svg>
  );
}

function IcoInstagram() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="13" height="13" rx="4" stroke="currentColor" strokeWidth="1.15"/>
      <circle cx="7.5" cy="7.5" r="2.8" stroke="currentColor" strokeWidth="1.15"/>
      <circle cx="11.2" cy="3.8" r="0.7" fill="currentColor"/>
    </svg>
  );
}

// ── Reusable subcomponents ────────────────────────────────

type FootHref = ComponentProps<typeof Link>['href'];

function FootLink({ href, icon, children }: { href: FootHref; icon: ReactNode; children: ReactNode }) {
  return (
    <li>
      <Link href={href}>
        <span className="foot-nav-ico">{icon}</span>
        {children}
      </Link>
    </li>
  );
}

function SocialLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className="foot-soc-link">
      {children}
    </a>
  );
}

// ── Footer ────────────────────────────────────────────────

export default function Footer() {
  const t = useTranslations('foot');

  return (
    <footer>
      <div className="container-page">
        <div className="foot-grid">

          {/* Brand */}
          <div>
            <a href="/" className="logo" aria-label="AmanaPOS">
              <span className="logo-mark">أ</span>
              <span className="ar">أمانة</span>
              <span className="la">AmanaPOS</span>
            </a>
            <p className="foot-tag">{t('tag')}</p>
            <div className="foot-soc">
              <SocialLink href="https://linkedin.com/company/amanapos" label="LinkedIn">
                <IcoLinkedIn />
              </SocialLink>
              <SocialLink href="https://x.com/amanapos" label="X">
                <IcoX />
              </SocialLink>
              <SocialLink href="https://instagram.com/amanapos" label="Instagram">
                <IcoInstagram />
              </SocialLink>
            </div>
          </div>

          {/* Product — scroll to sections on home page */}
          <div className="foot-col">
            <h4>{t('c1')}</h4>
            <ul>
              <FootLink href={{ pathname: '/', hash: 'features' }} icon={<IcoGrid />}>{t('c1a')}</FootLink>
              <FootLink href={{ pathname: '/', hash: 'pricing' }} icon={<IcoCoin />}>{t('c1b')}</FootLink>
              <FootLink href={{ pathname: '/', hash: 'how' }} icon={<IcoList />}>{t('c1c')}</FootLink>
              <FootLink href="/download" icon={<IcoDownload />}>{t('c1d')}</FootLink>
            </ul>
          </div>

          {/* Company */}
          <div className="foot-col">
            <h4>{t('c2')}</h4>
            <ul>
              <FootLink href="/about" icon={<IcoPerson />}>{t('c2a')}</FootLink>
              <FootLink href="/customers" icon={<IcoUsers />}>{t('c2b')}</FootLink>
              <FootLink href="/contact" icon={<IcoMail />}>{t('c2c')}</FootLink>
              <FootLink href="/careers" icon={<IcoBriefcase />}>{t('c2d')}</FootLink>
            </ul>
          </div>

          {/* Support */}
          <div className="foot-col">
            <h4>{t('c3')}</h4>
            <ul>
              <FootLink href="/help" icon={<IcoQuestion />}>{t('c3a')}</FootLink>
              <FootLink href="/guide" icon={<IcoBook />}>{t('c3b')}</FootLink>
              <FootLink href="/status" icon={<IcoPulse />}>{t('c3c')}</FootLink>
              <FootLink href="/privacy" icon={<IcoShield />}>{t('c3d')}</FootLink>
            </ul>
          </div>

        </div>

        <div className="foot-bottom">
          <span>{t('copy')}</span>
          <span>{t('built')}</span>
        </div>
      </div>
    </footer>
  );
}
