'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import FadeIn from '@/components/ui/FadeIn';

type Feature = { title: string; description: string };

const FEATURE_META = [
  { tint: '#0F766E', bg: '#F0FDFA', border: '#99F6E4', icon: (
    <path d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.6L21 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  )},
  { tint: '#0EA5E9', bg: '#F0F9FF', border: '#BAE6FD', icon: (
    <>
      <path d="m12 2 10 5v10l-10 5L2 17V7l10-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
      <path d="m2 7 10 5 10-5M12 12v10" stroke="currentColor" strokeWidth="2" />
    </>
  )},
  { tint: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0', icon: (
    <>
      <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M7 14l4-4 3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  )},
  { tint: '#DB2777', bg: '#FFF0F6', border: '#FBCFE8', icon: (
    <>
      <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
      <path d="M3 20a6 6 0 0 1 12 0M16 11l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </>
  )},
  { tint: '#D97706', bg: '#FFFBEB', border: '#FDE68A', icon: (
    <>
      <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="19.5" r="1.5" fill="currentColor" />
    </>
  )},
  { tint: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE', icon: (
    <>
      <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
      <path d="M3 11h18M7 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>
  )},
] as const;

export default function Features() {
  const t     = useTranslations('features');
  const items = t.raw('items') as Feature[];

  return (
    <section
      id="features"
      className="relative py-24 lg:py-32"
      style={{ background: '#F8FAFC' }}
    >
      <div className="container-page">

        {/* Section header */}
        <FadeIn className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-extrabold uppercase tracking-widest bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4]/60 mb-5">
            {t('eyebrow')}
          </span>
          <h2
            className="font-black tracking-tight text-[#0F172A] text-balance"
            style={{ fontSize: 'clamp(26px, 3.5vw, 44px)', lineHeight: 1.1 }}
          >
            {t('title')}
          </h2>
          <p className="mt-4 text-[#475569] font-medium leading-relaxed max-w-xl mx-auto text-pretty">
            {t('subtitle')}
          </p>
        </FadeIn>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((feature, i) => {
            const meta = FEATURE_META[i % FEATURE_META.length];
            return (
              <FadeIn key={feature.title} delay={0.06 * (i % 3)}>
                <motion.div
                  whileHover={{ y: -5, boxShadow: '0 20px 48px rgba(15,23,42,0.09)' }}
                  transition={{ duration: 0.22 }}
                  className="group p-7 rounded-2xl bg-white border cursor-default"
                  style={{
                    borderColor: '#E2E8F0',
                    boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
                  }}
                >
                  {/* Icon */}
                  <div
                    className="w-11 h-11 rounded-[13px] grid place-items-center mb-5 transition-transform duration-200 group-hover:scale-110"
                    style={{ background: meta.bg, color: meta.tint, border: `1px solid ${meta.border}` }}
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                      {meta.icon}
                    </svg>
                  </div>

                  <h3 className="text-[17px] font-black tracking-tight text-[#0F172A] mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm font-medium leading-relaxed text-[#64748B] text-pretty">
                    {feature.description}
                  </p>
                </motion.div>
              </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
