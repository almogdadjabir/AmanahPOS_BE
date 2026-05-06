'use client';

import { motion } from 'framer-motion';
import { ArrowRight, Check } from 'lucide-react';
import { useTranslations } from 'next-intl';
import FadeIn from '@/components/ui/FadeIn';

type Plan = {
  name:     string;
  price:    string;
  period:   string;
  blurb:    string;
  features: string[];
  cta:      string;
  primary:  boolean;
  badge?:   string;
};

export default function Pricing() {
  const t     = useTranslations('pricing');
  const plans = t.raw('plans') as Plan[];

  return (
    <section id="pricing" className="relative py-24 lg:py-32 overflow-hidden bg-[#F8FAFC]">
      {/* Subtle bg tint */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse 50% 40% at 15% 90%, rgba(15,118,110,0.04) 0%, transparent 60%), ' +
            'radial-gradient(ellipse 40% 30% at 85% 10%, rgba(245,158,11,0.04) 0%, transparent 55%)',
        }}
      />

      <div className="container-page relative z-10">

        {/* Header */}
        <FadeIn className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold uppercase tracking-widest bg-[#F0FDFA] text-[#0F766E] border border-[#99F6E4]/60 mb-5">
            {t('eyebrow')}
          </span>
          <h2
            className="font-black tracking-tight text-[#0F172A] text-balance"
            style={{ fontSize: 'clamp(26px, 3.2vw, 42px)', lineHeight: 1.1 }}
          >
            {t('title')}
          </h2>
          <p className="mt-4 text-[#475569] leading-relaxed max-w-xl mx-auto text-pretty" style={{ fontWeight: 450 }}>
            {t('subtitle')}
          </p>
        </FadeIn>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch max-w-5xl mx-auto">
          {plans.map((plan, i) => (
            <FadeIn key={plan.name} delay={0.08 * i}>
              {plan.primary
                ? <FeaturedCard plan={plan} />
                : <DefaultCard plan={plan} />}
            </FadeIn>
          ))}
        </div>

        {/* Footer note */}
        <FadeIn delay={0.2} className="text-center mt-10">
          <p className="text-[12.5px] text-[#94A3B8] font-medium">
            No credit card required. Cancel any time. Prices in SDG.
          </p>
        </FadeIn>
      </div>
    </section>
  );
}

/* ── Featured card ─────────────────────────────────────────────────────── */

function FeaturedCard({ plan }: { plan: Plan }) {
  return (
    <motion.div
      whileHover={{ y: -6 }}
      transition={{ duration: 0.22 }}
      className="relative rounded-[22px] overflow-hidden bg-white flex flex-col"
      style={{
        boxShadow:
          '0 20px 56px -12px rgba(15,118,110,0.20), ' +
          '0 4px 16px rgba(15,23,42,0.06), ' +
          '0 0 0 1.5px rgba(15,118,110,0.20)',
      }}
    >
      {/* Teal top stripe */}
      <div
        className="h-[3px] shrink-0"
        style={{ background: 'linear-gradient(90deg, #0F766E 0%, #14B8A6 100%)' }}
      />

      <div className="flex flex-col flex-1 p-7 pt-6">
        {/* Badge + name */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[#0F766E]">
            {plan.name}
          </div>
          {plan.badge && (
            <div
              className="px-2.5 py-1 rounded-full text-[9.5px] font-black uppercase tracking-widest text-[#0F172A]"
              style={{ background: 'linear-gradient(135deg, #FEF3C7, #FDE68A)' }}
            >
              {plan.badge}
            </div>
          )}
        </div>

        {/* Price */}
        <div className="flex items-baseline gap-1.5 mb-2">
          <span
            className="font-black tracking-[-2px] text-[#0F172A]"
            style={{ fontSize: 'clamp(30px, 3.5vw, 44px)', lineHeight: 1 }}
          >
            {plan.price}
          </span>
          <span className="text-[12.5px] font-semibold text-[#94A3B8]">{plan.period}</span>
        </div>

        <p className="text-[12.5px] leading-relaxed text-[#475569] mb-5" style={{ fontWeight: 450 }}>
          {plan.blurb}
        </p>

        <div className="h-px bg-[#EEF2F7] mb-5" />

        {/* Features */}
        <ul className="space-y-2.5 mb-7 flex-1">
          {plan.features.map((feat) => (
            <li key={feat} className="flex items-start gap-2.5">
              <span className="w-4.5 h-4.5 rounded-full bg-[#F0FDFA] border border-[#99F6E4]/60 flex items-center justify-center shrink-0 mt-0.5">
                <Check size={9} strokeWidth={3} className="text-[#0F766E]" />
              </span>
              <span className="text-[12.5px] font-semibold text-[#0F172A] leading-snug">{feat}</span>
            </li>
          ))}
        </ul>

        {/* CTA */}
        <a
          href="#signup"
          className="btn-primary flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-[14px] font-black text-white no-underline transition-all duration-200 hover:-translate-y-0.5"
        >
          {plan.cta}
          <ArrowRight size={14} strokeWidth={2.5} />
        </a>
      </div>
    </motion.div>
  );
}

/* ── Default card ──────────────────────────────────────────────────────── */

function DefaultCard({ plan }: { plan: Plan }) {
  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '0 16px 40px rgba(15,23,42,0.08)' }}
      transition={{ duration: 0.22 }}
      className="p-7 bg-white rounded-[22px] border border-[#E8EFF6] flex flex-col cursor-default"
      style={{ boxShadow: '0 1px 6px rgba(15,23,42,0.04)' }}
    >
      {/* Name */}
      <div className="text-[10.5px] font-extrabold uppercase tracking-[0.14em] text-[#94A3B8] mb-4">
        {plan.name}
      </div>

      {/* Price */}
      <div className="flex items-baseline gap-1.5 mb-2">
        <span
          className="font-black tracking-[-2px] text-[#0F172A]"
          style={{ fontSize: 'clamp(26px, 3vw, 38px)', lineHeight: 1 }}
        >
          {plan.price}
        </span>
        <span className="text-[12px] font-semibold text-[#94A3B8]">{plan.period}</span>
      </div>

      <p className="text-[12.5px] leading-relaxed text-[#475569] mb-5 flex-none" style={{ fontWeight: 450 }}>
        {plan.blurb}
      </p>

      <div className="h-px bg-[#F1F5F9] mb-5" />

      {/* Features */}
      <ul className="space-y-2.5 mb-7 flex-1">
        {plan.features.map((feat) => (
          <li key={feat} className="flex items-start gap-2.5">
            <span className="w-4 h-4 rounded-full bg-[#F0FDFA] flex items-center justify-center shrink-0 mt-0.5">
              <Check size={9} strokeWidth={3} className="text-[#0F766E]" />
            </span>
            <span className="text-[12.5px] font-semibold text-[#0F172A] leading-snug">{feat}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      <a
        href="#signup"
        className="flex items-center justify-center w-full py-3 rounded-xl text-[13.5px] font-bold text-[#475569] no-underline border border-[#E2E8F0] hover:border-[#0F766E]/30 hover:bg-[#F0FDFA] hover:text-[#0F766E] transition-all duration-200"
      >
        {plan.cta}
      </a>
    </motion.div>
  );
}
