'use client';
import { useState } from 'react';
import { useTranslations } from 'next-intl';

const DASHBOARD_URL = process.env.NEXT_PUBLIC_DASHBOARD_URL || '#';

export default function MobileMenu() {
  const [open, setOpen] = useState(false);
  const t = useTranslations('nav');

  const close = () => setOpen(false);

  return (
    <>
      <button
        className="mobile-menu-btn"
        onClick={() => setOpen(!open)}
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        aria-controls="mobile-nav"
      >
        {open ? (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <line x1="2" y1="2" x2="16" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="16" y1="2" x2="2" y2="16" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <line x1="2" y1="5" x2="16" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <line x1="2" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        )}
      </button>

      {open && (
        <div id="mobile-nav" className="mobile-menu-drawer">
          <a href="#features" onClick={close}>{t('features')}</a>
          <a href="#demo" onClick={close}>{t('demo')}</a>
          <a href="#how" onClick={close}>{t('how')}</a>
          <a href="#pricing" onClick={close}>{t('pricing')}</a>
          <div className="mobile-divider" />
          <a href={DASHBOARD_URL} onClick={close}>{t('signin')}</a>
          <a href={DASHBOARD_URL} className="btn" onClick={close}>
            <span>{t('cta')}</span>
            <span className="arrow" aria-hidden="true">→</span>
          </a>
        </div>
      )}
    </>
  );
}
