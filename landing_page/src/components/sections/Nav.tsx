'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Logo from '@/components/ui/Logo';
import LocaleSwitcher from '@/components/ui/LocaleSwitcher';

const NAV_LINKS = [
  { key: 'features',   href: '#features' },
  { key: 'howItWorks', href: '#how'      },
  { key: 'pricing',    href: '#pricing'  },
  { key: 'download',   href: '#download' },
] as const;

const NAV_HEIGHT = 68;

export default function Nav() {
  const t = useTranslations('nav');
  const [scrolled, setScrolled]   = useState(false);
  const [menuOpen, setMenuOpen]   = useState(false);

  useEffect(() => {
    const check = () => setScrolled(window.scrollY > 32);
    check();
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, []);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth >= 768) setMenuOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  return (
    <>
      <nav
        className="sticky top-0 z-50 transition-all duration-300"
        style={{
          height: NAV_HEIGHT,
          backgroundColor: scrolled ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0)',
          backdropFilter: scrolled ? 'blur(14px) saturate(180%)' : 'none',
          WebkitBackdropFilter: scrolled ? 'blur(14px) saturate(180%)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(15,23,42,0.07)' : '1px solid transparent',
          boxShadow: scrolled ? '0 2px 20px rgba(15,23,42,0.04)' : 'none',
        }}
        aria-label="Main navigation"
      >
        <div className="container-page flex items-center gap-4" style={{ height: NAV_HEIGHT }}>
          {/* Logo */}
          <a href="#" className="flex items-center gap-2.5 no-underline shrink-0">
            <Logo size={30} />
            <span className="font-black text-[15px] tracking-tight text-[#0F172A]">
              AmanaPOS
            </span>
          </a>

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6 ms-auto">
            {NAV_LINKS.map((link) => (
              <a
                key={link.key}
                href={link.href}
                className="text-[13.5px] font-semibold no-underline text-[#64748B] hover:text-[#0F172A] transition-colors duration-150"
              >
                {t(link.key)}
              </a>
            ))}
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-2 ms-auto md:ms-0">
            <LocaleSwitcher />
            <a
              href="#login"
              className="px-4 h-[34px] inline-flex items-center rounded-xl text-[13.5px] font-semibold no-underline text-[#64748B] border border-[#E2E8F0] bg-white/70 hover:text-[#0F172A] hover:border-[#CBD5E1] transition-all duration-150"
            >
              {t('signIn')}
            </a>
            <a
              href="#signup"
              className="btn-primary px-4 h-[34px] inline-flex items-center gap-1.5 rounded-xl text-[13.5px] font-bold no-underline text-white transition-all duration-200 hover:-translate-y-px"
            >
              {t('getStarted')}
              <ArrowIcon />
            </a>
          </div>

          {/* Mobile: locale + hamburger */}
          <div className="flex md:hidden items-center gap-2 ms-auto">
            <LocaleSwitcher />
            <button
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="w-9 h-9 flex flex-col items-center justify-center gap-[5.5px] rounded-xl hover:bg-[#F1F5F9] transition-colors"
            >
              <motion.span
                className="w-[18px] h-[1.5px] rounded-full bg-[#0F172A] origin-center block"
                animate={{ rotate: menuOpen ? 45 : 0, y: menuOpen ? 7 : 0 }}
                transition={{ duration: 0.22 }}
              />
              <motion.span
                className="w-3 h-[1.5px] rounded-full bg-[#94A3B8] block"
                animate={{ opacity: menuOpen ? 0 : 1, scaleX: menuOpen ? 0 : 1 }}
                transition={{ duration: 0.18 }}
              />
              <motion.span
                className="w-[18px] h-[1.5px] rounded-full bg-[#0F172A] origin-center block"
                animate={{ rotate: menuOpen ? -45 : 0, y: menuOpen ? -7 : 0 }}
                transition={{ duration: 0.22 }}
              />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile full-screen menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed z-40 md:hidden bg-white"
            style={{ top: NAV_HEIGHT, inset: 0 }}
          >
            <div className="container-page py-6 flex flex-col h-full overflow-y-auto">
              <nav className="flex flex-col">
                {NAV_LINKS.map((link, i) => (
                  <motion.a
                    key={link.key}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.055, duration: 0.22 }}
                    className="py-4 text-[20px] font-bold text-[#0F172A] border-b border-[#F1F5F9] no-underline hover:text-primary transition-colors"
                  >
                    {t(link.key)}
                  </motion.a>
                ))}
              </nav>
              <div className="flex flex-col gap-2.5 mt-8">
                <a
                  href="#login"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center justify-center h-12 rounded-xl text-sm font-semibold text-[#475569] border border-[#E2E8F0] no-underline hover:text-[#0F172A] hover:border-[#CBD5E1] transition-all"
                >
                  {t('signIn')}
                </a>
                <a
                  href="#signup"
                  onClick={() => setMenuOpen(false)}
                  className="btn-primary flex items-center justify-center gap-2 h-12 rounded-xl text-sm font-bold text-white no-underline transition-all"
                >
                  {t('getStarted')}
                  <ArrowIcon />
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function ArrowIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" className="flip-rtl">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
