import { getTranslations } from 'next-intl/server';
import SectionHead from '@/components/ui/SectionHead';
import Button from '@/components/ui/Button';

type Plan = {
  name: string;
  price: string;
  period: string;
  blurb: string;
  features: string[];
  cta: string;
  primary: boolean;
  badge?: string;
};

export default async function Pricing() {
  const t = await getTranslations('pricing');
  const plans = t.raw('plans') as Plan[];

  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="container-page">
        <SectionHead
          kicker={t('eyebrow')}
          title={t('title')}
          subtitle={t('subtitle')}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {plans.map((plan) => (
            <PlanCard key={plan.name} plan={plan} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  return (
    <div
      className={[
        'relative p-8 rounded-[22px]',
        plan.primary
          ? 'bg-deep text-white border border-white/10 shadow-[0_30px_60px_-20px_rgba(15,23,42,0.3)] -translate-y-3'
          : 'bg-white border border-[#F1F5F9]',
      ].join(' ')}
    >
      {plan.badge && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-secondary text-[#0B1220] rounded-full text-[11px] font-black uppercase tracking-wide shadow-[0_8px_16px_-4px_rgba(245,158,11,0.4)] whitespace-nowrap">
          {plan.badge}
        </div>
      )}

      <div className={`text-sm font-extrabold uppercase tracking-widest mb-3 ${plan.primary ? 'text-white/60' : 'text-text-secondary'}`}>
        {plan.name}
      </div>

      <div className="flex items-baseline gap-1.5 mb-3">
        <span className="text-[44px] font-black tracking-[-2px]">{plan.price}</span>
        <span className={`text-sm font-bold ${plan.primary ? 'text-white/60' : 'text-text-secondary'}`}>
          {plan.period}
        </span>
      </div>

      <p className={`text-sm font-medium leading-relaxed mb-5 ${plan.primary ? 'text-white/60' : 'text-text-secondary'}`}>
        {plan.blurb}
      </p>

      <div className={`h-px mb-5 ${plan.primary ? 'bg-white/10' : 'bg-[#F1F5F9]'}`} />

      <ul className="space-y-2.5 mb-6">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2.5">
            <CheckCircle primary={plan.primary} />
            <span className={`text-sm font-semibold ${plan.primary ? 'text-white' : 'text-text-primary'}`}>
              {feature}
            </span>
          </li>
        ))}
      </ul>

      <Button
        as="a"
        href="#signup"
        variant={plan.primary ? 'dark' : 'default'}
        size="lg"
        className="w-full justify-center"
      >
        {plan.cta}
      </Button>
    </div>
  );
}

function CheckCircle({ primary }: { primary: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="shrink-0 mt-0.5">
      <circle cx="12" cy="12" r="10" fill={primary ? 'rgba(15,118,110,0.3)' : '#CCFBF1'} />
      <path d="m8 12 3 3 5-6" stroke={primary ? '#fff' : '#0F766E'} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
