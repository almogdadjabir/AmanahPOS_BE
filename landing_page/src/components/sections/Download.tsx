'use client';

import { motion } from 'framer-motion';
import { ShieldCheck, Zap, WifiOff } from 'lucide-react';
import { useTranslations } from 'next-intl';
import FadeIn from '@/components/ui/FadeIn';

const TRUST_BADGES = [
  { Icon: ShieldCheck, key: 'No credit card required' },
  { Icon: Zap,         key: 'Start in 2 minutes'      },
  { Icon: WifiOff,     key: 'Works offline'            },
] as const;

export default function Download() {
  const t = useTranslations('download');

  return (
    <section id="download" className="relative py-24 lg:py-32 overflow-hidden" style={{ background: '#07111E' }}>
      {/* Radial glow accents */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 55% at 85% 60%, rgba(15,118,110,0.16) 0%, transparent 60%), ' +
            'radial-gradient(ellipse 40% 40% at 10% 30%, rgba(245,158,11,0.08) 0%, transparent 55%)',
        }}
      />

      {/* Subtle dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      <div className="container-page relative z-10">
        <div className="max-w-[660px] mx-auto text-center">

          {/* Eyebrow */}
          <FadeIn>
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest border border-white/15 bg-white/8 text-white/70 mb-6">
              <span
                className="w-1.5 h-1.5 rounded-full bg-[#F59E0B] shrink-0"
                style={{ animation: 'dot-pulse 2s ease-in-out infinite' }}
              />
              {t('eyebrow')}
            </span>

            {/* Heading */}
            <h2
              className="font-black tracking-tight text-white text-balance"
              style={{ fontSize: 'clamp(28px, 3.8vw, 50px)', lineHeight: 1.1 }}
            >
              {t('title')}
            </h2>

            <p className="mt-5 text-white/50 font-medium leading-relaxed text-pretty">
              {t('subtitle')}
            </p>
          </FadeIn>

          {/* App store buttons */}
          <FadeIn delay={0.14} className="flex justify-center flex-wrap gap-3 mt-10">

            {/* App Store */}
            <motion.a
              href="#ios"
              className="inline-flex items-center gap-3 px-5 py-3.5 rounded-xl no-underline transition-colors duration-200"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              }}
              whileHover={{
                background: 'rgba(255,255,255,0.12)',
                y: -2,
              }}
              transition={{ duration: 0.18 }}
            >
              <AppleIcon />
              <div className="text-start">
                <div className="text-[10px] font-bold text-white/45 uppercase tracking-wide">
                  Download on the
                </div>
                <div className="text-[15px] font-black text-white leading-tight">{t('ios')}</div>
              </div>
            </motion.a>

            {/* Google Play */}
            <motion.a
              href="#android"
              className="inline-flex items-center gap-3 px-5 py-3.5 rounded-xl no-underline transition-colors duration-200"
              style={{
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.12)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
              }}
              whileHover={{
                background: 'rgba(255,255,255,0.12)',
                y: -2,
              }}
              transition={{ duration: 0.18 }}
            >
              <PlayStoreIcon />
              <div className="text-start">
                <div className="text-[10px] font-bold text-white/45 uppercase tracking-wide">
                  Get it on
                </div>
                <div className="text-[15px] font-black text-white leading-tight">{t('android')}</div>
              </div>
            </motion.a>

            {/* Web CTA */}
            <motion.a
              href="#signup"
              className="btn-primary inline-flex items-center gap-2 px-7 py-3.5 rounded-xl text-[15px] font-black text-white no-underline"
              whileHover={{ y: -2 }}
              transition={{ duration: 0.18 }}
            >
              {t('web')}
              <ArrowIcon />
            </motion.a>
          </FadeIn>

          {/* Trust badges */}
          <FadeIn delay={0.22} className="mt-10 flex flex-wrap items-center justify-center gap-6">
            {TRUST_BADGES.map(({ Icon, key }) => (
              <div key={key} className="flex items-center gap-2">
                <Icon size={14} className="text-white/40" strokeWidth={2} />
                <span className="text-sm font-semibold text-white/40">{key}</span>
              </div>
            ))}
          </FadeIn>
        </div>
      </div>
    </section>
  );
}

function ArrowIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="flip-rtl">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="white">
      <path d="M17.5 12.5c0-2 1.5-3 1.5-3s-1-2-3-2c-1.5 0-2.5 1-3 1s-1.5-1-3-1c-2 0-4 1.5-4 4.5 0 4 3 7 4.5 7 1 0 1.5-1 2.5-1s1.5 1 2.5 1c1.5 0 4-3 4-5.5 0-1-1-1-1-1ZM14 5c1-1 1-2.5 1-2.5s-1.5 0-2.5 1-1 2.5-1 2.5 1.5 0 2.5-1Z" />
    </svg>
  );
}

function PlayStoreIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <path d="M5 3.5 19 12 5 20.5V3.5Z" fill="#34D399" />
      <path d="M5 3.5 12.5 11 5 3.5Z" fill="#60A5FA" />
      <path d="M5 20.5 12.5 13 5 20.5Z" fill="#F87171" />
      <path d="M12.5 11 19 12l-6.5 1L12.5 11Z" fill="#FBBF24" />
    </svg>
  );
}
