import { getTranslations } from 'next-intl/server';
import SectionHead from '@/components/ui/SectionHead';

type Step = { number: string; title: string; description: string };

export default async function HowItWorks() {
  const t = await getTranslations('howItWorks');
  const steps = t.raw('steps') as Step[];

  return (
    <section id="how" className="py-24 bg-white">
      <div className="container-page">
        <SectionHead
          kicker={t('eyebrow')}
          title={t('title')}
          subtitle={t('subtitle')}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {steps.map((step, i) => (
            <div
              key={step.number}
              className="relative p-8 bg-white rounded-[18px] border border-[#F1F5F9]"
            >
              {/* Connector line between cards (desktop only) */}
              {i < steps.length - 1 && (
                <div className="hidden md:block absolute top-12 end-0 translate-x-1/2 w-6 h-px bg-[#E2E8F0] z-10" />
              )}

              <div className="text-[56px] font-black leading-none tracking-[-3px] text-primary-light mb-3 select-none">
                {step.number}
              </div>
              <h3 className="text-xl font-black tracking-tight text-text-primary mb-2">
                {step.title}
              </h3>
              <p className="text-sm font-medium leading-relaxed text-text-secondary text-pretty">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
