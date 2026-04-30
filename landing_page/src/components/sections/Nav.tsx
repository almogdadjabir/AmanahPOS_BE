'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import Logo from '@/components/ui/Logo';
import Button from '@/components/ui/Button';
import LocaleSwitcher from '@/components/ui/LocaleSwitcher';

const NAV_LINKS = [
  { key: 'features', href: '#features' },
  { key: 'howItWorks', href: '#how' },
  { key: 'pricing', href: '#pricing' },
  { key: 'download', href: '#download' },
] as const;

export default function Nav() {
  const t = useTranslations('nav');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav
      className={[
        'sticky top-0 z-50 transition-[background,border-color] duration-200',
        scrolled
          ? 'bg-white/92 backdrop-blur-[14px] border-b border-[#F1F5F9]'
          : 'bg-transparent border-b border-transparent',
      ].join(' ')}
    >
      <div className="container-page flex items-center gap-6 h-[72px]">
        {/* Logo */}
        <a
          href="#"
          className="flex items-center gap-2.5 no-underline text-text-primary shrink-0"
        >
          <Logo size={34} />
          <span className="font-black text-[17px] tracking-tight">AmanaPOS</span>
        </a>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-7 ms-auto">
          {NAV_LINKS.map((link) => (
            <a
              key={link.key}
              href={link.href}
              className="text-sm font-bold text-text-secondary hover:text-text-primary transition-colors no-underline"
            >
              {t(link.key)}
            </a>
          ))}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 ms-auto md:ms-0">
          <LocaleSwitcher />
          <Button as="a" href="#login" size="sm">
            {t('signIn')}
          </Button>
          <Button as="a" href="#signup" variant="primary" size="sm">
            {t('getStarted')}
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              className="flip-rtl"
            >
              <path
                d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </Button>
        </div>
      </div>
    </nav>
  );
}
