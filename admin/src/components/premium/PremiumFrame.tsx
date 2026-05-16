'use client';

import { Layers, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

export interface PremiumFrameProps {
  feature:        string;
  plan:           string;
  subtitle?:      string;
  icon?:          ReactNode;
  actions?:       ReactNode;
  heroChildren?:  ReactNode;
  children?:      ReactNode;
  className?:     string;
}

export function PremiumFrame({
  feature, plan, subtitle, icon, actions, heroChildren, children, className,
}: PremiumFrameProps) {
  return (
    <div className={cn('flex flex-col gap-6', className)}>
      <PremiumHero feature={feature} plan={plan} subtitle={subtitle} icon={icon} actions={actions}>
        {heroChildren}
      </PremiumHero>
      {children}
    </div>
  );
}

function PremiumHero({
  feature, plan, subtitle, icon, actions, children,
}: Pick<PremiumFrameProps, 'feature' | 'plan' | 'subtitle' | 'icon' | 'actions'> & { children?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-[22px] bg-premium-hero premium-hero-sheen text-white px-7 py-6">
      <svg className="absolute inset-0 h-full w-full opacity-[0.07] mix-blend-overlay pointer-events-none" preserveAspectRatio="none" viewBox="0 0 100 100">
        <defs>
          <pattern id="premiumMesh" width="5" height="5" patternUnits="userSpaceOnUse">
            <circle cx="0.5" cy="0.5" r="0.3" fill="white" />
          </pattern>
        </defs>
        <rect width="100" height="100" fill="url(#premiumMesh)" />
      </svg>

      <div className="relative flex items-start gap-4">
        <div
          className="grid place-items-center w-13 h-13 rounded-xl bg-premium-grad flex-shrink-0"
          style={{ width: 52, height: 52, boxShadow: '0 12px 28px -10px rgba(55,63,148,0.6), inset 0 1px 0 rgba(255,255,255,0.25), inset 0 -10px 24px rgba(0,0,0,0.18), inset 0 0 0 1px rgba(232,215,166,0.22)' }}
        >
          {icon ?? <Layers className="h-6 w-6" strokeWidth={2} />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="m-0 text-[22px] font-extrabold tracking-tight whitespace-nowrap">{feature}</h1>
            <PremiumBadge />
            <PremiumStatus plan={plan} />
          </div>
          {subtitle && <div className="mt-1.5 text-xs font-medium text-white/65">{subtitle}</div>}
        </div>

        <div className="flex gap-2 flex-shrink-0">{actions}</div>
      </div>

      {children && <div className="relative mt-5">{children}</div>}
    </div>
  );
}

export function PremiumBadge({ label = 'Premium' }: { label?: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-[3px] rounded-full text-[9.5px] font-extrabold uppercase tracking-[0.6px] text-white flex-shrink-0"
      style={{ background: 'linear-gradient(155deg, #6471C7 0%, #4751B0 50%, #2B3173 100%)', boxShadow: '0 2px 8px -2px rgba(55,63,148,0.45), inset 0 0 0 1px rgba(232,215,166,0.22)' }}
    >
      <Sparkles className="h-2.5 w-2.5" style={{ color: '#F1E2B6' }} fill="#F1E2B6" />
      {label}
    </span>
  );
}

function PremiumStatus({ plan }: { plan: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2.5 py-[3px] rounded-full text-[11px] font-bold flex-shrink-0"
      style={{ background: 'rgba(94, 234, 212, 0.10)', color: '#5EEAD4', border: '1px solid rgba(94, 234, 212, 0.25)' }}
    >
      <span className="premium-live-dot block w-1.5 h-1.5 rounded-full" style={{ background: '#5EEAD4' }} />
      Active · {plan}
    </span>
  );
}
