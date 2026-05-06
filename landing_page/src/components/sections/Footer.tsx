'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import Logo from '@/components/ui/Logo';
import FadeIn from '@/components/ui/FadeIn';

type Column = { title: string; links: string[] };

const SOCIAL = [
  {
    label: 'X / Twitter',
    icon: <path d="M4 4l16 16M4 20 20 4" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />,
  },
  {
    label: 'Facebook',
    icon: <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />,
  },
  {
    label: 'Instagram',
    icon: (
      <>
        <rect x="2" y="2" width="20" height="20" rx="5" stroke="currentColor" strokeWidth="2" />
        <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
      </>
    ),
  },
];

export default function Footer() {
  const t       = useTranslations('footer');
  const columns = t.raw('columns') as Column[];

  return (
    <footer
      className="relative border-t overflow-hidden"
      style={{ background: '#07111E', borderTopColor: 'rgba(255,255,255,0.07)' }}
    >
      {/* Dot grid */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none opacity-25"
        style={{
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
        }}
      />

      {/* Bottom gradient accent */}
      <div
        aria-hidden
        className="absolute bottom-0 left-0 right-0 h-[200px] pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 70% 80% at 50% 100%, rgba(15,118,110,0.1) 0%, transparent 70%)',
        }}
      />

      <div className="container-page relative z-10 pt-16 pb-8">

        {/* Main grid */}
        <FadeIn>
          <div className="grid grid-cols-2 md:grid-cols-[1.8fr_repeat(4,1fr)] gap-8 mb-14">

            {/* Brand column */}
            <div className="col-span-2 md:col-span-1">
              <a href="#" className="inline-flex items-center gap-2.5 text-white no-underline mb-4">
                <Logo size={32} />
                <span className="font-black text-[17px] tracking-tight">AmanaPOS</span>
              </a>
              <p className="text-[13.5px] leading-relaxed text-white/40 max-w-[240px] mb-6">
                {t('tagline')}
              </p>

              {/* Social icons */}
              <div className="flex gap-2">
                {SOCIAL.map((s) => (
                  <motion.a
                    key={s.label}
                    href="#"
                    aria-label={s.label}
                    className="w-9 h-9 rounded-xl grid place-items-center text-white/35 no-underline"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(255,255,255,0.08)',
                    }}
                    whileHover={{ y: -2, color: 'rgba(255,255,255,0.85)' }}
                    transition={{ duration: 0.15 }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      {s.icon}
                    </svg>
                  </motion.a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {columns.map((col) => (
              <div key={col.title}>
                <div className="text-[10px] font-extrabold uppercase tracking-[0.15em] text-white/25 mb-4">
                  {col.title}
                </div>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a
                        href="#"
                        className="text-[13px] font-semibold text-white/40 hover:text-white/80 no-underline transition-colors duration-150"
                      >
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* Bottom bar */}
        <div
          className="pt-6 flex flex-wrap justify-between items-center gap-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}
        >
          <p className="text-[12.5px] font-semibold text-white/25">
            {t('copyright')}
          </p>
          <div className="flex items-center gap-1.5">
            <div
              className="w-1.5 h-1.5 rounded-full bg-[#0F766E]"
              style={{
                animation: 'dot-pulse 2.5s ease-in-out infinite',
                boxShadow: '0 0 6px rgba(15,118,110,0.6)',
              }}
            />
            <span className="text-[12px] font-bold text-white/25">All systems operational</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
