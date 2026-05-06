'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import FadeIn from '@/components/ui/FadeIn';

type Step = { number: string; title: string; description: string };

const STEP_META = [
  {
    tint: '#0F766E',
    bg: '#F0FDFA',
    border: '#99F6E4',
    glow: 'rgba(15,118,110,0.18)',
    icon: (
      <path d="M12 2a9 9 0 1 1 0 18A9 9 0 0 1 12 2Zm0 5v4l2.5 2.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    tint: '#7C3AED',
    bg: '#F5F3FF',
    border: '#DDD6FE',
    glow: 'rgba(124,58,237,0.15)',
    icon: (
      <>
        <rect x="2" y="3" width="20" height="14" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M8 21h8M12 17v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
  {
    tint: '#D97706',
    bg: '#FFFBEB',
    border: '#FDE68A',
    glow: 'rgba(217,119,6,0.15)',
    icon: (
      <>
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9l-7-7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="M9 15l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
] as const;

export default function HowItWorks() {
  const t     = useTranslations('howItWorks');
  const steps = t.raw('steps') as Step[];

  return (
    <section id="how" className="relative py-24 lg:py-32 bg-white overflow-hidden">
      {/* Subtle background tints */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 60% 50% at 100% 60%, rgba(15,118,110,0.04) 0%, transparent 60%), ' +
            'radial-gradient(ellipse 50% 40% at 0% 80%, rgba(245,158,11,0.04) 0%, transparent 55%)',
        }}
      />

      <div className="container-page relative z-10">

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

        {/* Steps */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Connector line (desktop only) */}
          <div
            aria-hidden
            className="hidden md:block absolute top-[52px] pointer-events-none"
            style={{
              insetInlineStart: 'calc(16.67% + 28px)',
              insetInlineEnd: 'calc(16.67% + 28px)',
              height: 1,
              background: 'linear-gradient(90deg, #99F6E4 0%, #DDD6FE 50%, #FDE68A 100%)',
            }}
          />

          {steps.map((step, i) => {
            const meta = STEP_META[i % STEP_META.length];
            return (
              <FadeIn key={step.number} delay={0.12 * i}>
                <motion.div
                  whileHover={{ y: -6, boxShadow: '0 20px 48px rgba(15,23,42,0.08)' }}
                  transition={{ duration: 0.22 }}
                  className="relative p-8 rounded-2xl bg-white border cursor-default"
                  style={{
                    borderColor: '#E2E8F0',
                    boxShadow: '0 1px 4px rgba(15,23,42,0.04)',
                  }}
                >
                  {/* Step icon circle */}
                  <div
                    className="relative w-14 h-14 rounded-2xl grid place-items-center mb-6"
                    style={{
                      background: meta.bg,
                      border: `1.5px solid ${meta.border}`,
                      boxShadow: `0 0 0 6px ${meta.glow}`,
                    }}
                  >
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" style={{ color: meta.tint }}>
                      {meta.icon}
                    </svg>
                  </div>

                  {/* Step number */}
                  <div
                    className="text-[11px] font-extrabold uppercase tracking-[0.14em] mb-3"
                    style={{ color: meta.tint }}
                  >
                    {step.number}
                  </div>

                  <h3 className="text-[18px] font-black tracking-tight text-[#0F172A] mb-2.5">
                    {step.title}
                  </h3>
                  <p className="text-sm font-medium leading-relaxed text-[#64748B] text-pretty">
                    {step.description}
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
