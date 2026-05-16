'use client';

import { useState, useEffect } from 'react';
import { useTranslations, useLocale } from 'next-intl';
import { Link } from '@/i18n/navigation';
import Logo from '@/components/ui/Logo';

export default function Nav() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const links = [
    { label: t('features'), href: '#features' },
    { label: t('how'),      href: '#how'      },
    { label: t('pricing'),  href: '#pricing'  },
    { label: t('download'), href: '#download' },
  ];

  return (
    <nav
      style={{
        position: 'sticky', top: 0, zIndex: 50,
        background: scrolled ? 'rgba(255,255,255,0.92)' : 'transparent',
        backdropFilter: scrolled ? 'saturate(180%) blur(14px)' : 'none',
        WebkitBackdropFilter: scrolled ? 'saturate(180%) blur(14px)' : 'none',
        borderBottom: `1px solid ${scrolled ? '#EEF2F6' : 'transparent'}`,
        transition: 'background 220ms, border-color 220ms',
      }}
    >
      <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 24, height: 72 }}>
        {/* Logo */}
        <Link
          href="/"
          style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: '#0F172A', flexShrink: 0 }}
        >
          <Logo size={34} />
          <span style={{ fontFamily: 'var(--font-nunito)', fontWeight: 900, fontSize: 17, letterSpacing: -0.4 }}>
            AmanaPOS
          </span>
        </Link>

        {/* Nav links */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 28, marginInlineStart: 'auto' }}>
          {links.map(l => (
            <a
              key={l.href}
              href={l.href}
              style={{ fontFamily: 'var(--font-nunito)', fontSize: 14, fontWeight: 700, color: '#475569', textDecoration: 'none', transition: 'color 160ms' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#0F172A')}
              onMouseLeave={e => (e.currentTarget.style.color = '#475569')}
            >
              {l.label}
            </a>
          ))}
        </div>

        {/* Right side */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Lang toggle */}
          <div style={{ display: 'flex', gap: 2, marginInlineEnd: 8 }}>
            <Link
              href="/"
              locale="ar"
              style={{
                fontSize: 11, fontWeight: 800, padding: '4px 8px', borderRadius: 6,
                background: locale === 'ar' ? '#0F766E' : 'transparent',
                color: locale === 'ar' ? '#fff' : '#94A3B8',
                transition: 'all 140ms',
              }}
            >
              ع
            </Link>
            <Link
              href="/"
              locale="en"
              style={{
                fontSize: 11, fontWeight: 800, padding: '4px 8px', borderRadius: 6,
                background: locale === 'en' ? '#0F766E' : 'transparent',
                color: locale === 'en' ? '#fff' : '#94A3B8',
                transition: 'all 140ms',
              }}
            >
              EN
            </Link>
          </div>

          <a
            href="#login"
            style={{
              fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800,
              padding: '8px 14px', borderRadius: 10,
              background: '#FFFFFF', color: '#0F172A',
              boxShadow: 'inset 0 0 0 1px #E2E8F0',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center',
              transition: 'transform 180ms cubic-bezier(.2,.85,.3,1)',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {t('signin')}
          </a>

          <a
            href="#signup"
            style={{
              fontFamily: 'var(--font-nunito)', fontSize: 13, fontWeight: 800,
              padding: '8px 14px', borderRadius: 10,
              background: '#0F766E', color: '#fff',
              boxShadow: '0 8px 22px rgba(15,118,110,0.28)',
              textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6,
              transition: 'transform 180ms cubic-bezier(.2,.85,.3,1)',
            }}
            onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-1px)')}
            onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
          >
            {t('cta')}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </a>
        </div>
      </div>
    </nav>
  );
}
