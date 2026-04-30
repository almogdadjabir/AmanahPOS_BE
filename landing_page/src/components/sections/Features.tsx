import { getTranslations } from 'next-intl/server';
import SectionHead from '@/components/ui/SectionHead';

type Feature = { title: string; description: string };

type FeatureStyle = {
  tint: string;
  bg: string;
  icon: React.ReactNode;
};

const FEATURE_STYLES: FeatureStyle[] = [
  {
    tint: '#0F766E',
    bg: '#CCFBF1',
    icon: (
      <path d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.6L21 7H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    ),
  },
  {
    tint: '#0EA5E9',
    bg: '#E0F2FE',
    icon: (
      <>
        <path d="m12 2 10 5v10l-10 5L2 17V7l10-5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <path d="m2 7 10 5 10-5M12 12v10" stroke="currentColor" strokeWidth="2" />
      </>
    ),
  },
  {
    tint: '#16A34A',
    bg: '#DCFCE7',
    icon: (
      <>
        <path d="M3 3v18h18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <path d="M7 14l4-4 3 3 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    tint: '#DB2777',
    bg: '#FCE7F3',
    icon: (
      <>
        <circle cx="9" cy="8" r="3.5" stroke="currentColor" strokeWidth="2" />
        <path d="M3 20a6 6 0 0 1 12 0M16 11l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </>
    ),
  },
  {
    tint: '#7C3AED',
    bg: '#EDE9FE',
    icon: (
      <>
        <path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5 5 0 0 1 7 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <circle cx="12" cy="19.5" r="1.5" fill="currentColor" />
      </>
    ),
  },
  {
    tint: '#0EA5E9',
    bg: '#E0F2FE',
    icon: (
      <>
        <rect x="3" y="6" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2" />
        <path d="M3 11h18M7 15h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </>
    ),
  },
];

export default async function Features() {
  const t = await getTranslations('features');
  const items = t.raw('items') as Feature[];

  return (
    <section id="features" className="py-24 bg-[#F8FAFC] border-y border-[#F1F5F9]">
      <div className="container-page">
        <SectionHead
          kicker={t('eyebrow')}
          title={t('title')}
          subtitle={t('subtitle')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {items.map((feature, i) => {
            const style = FEATURE_STYLES[i % FEATURE_STYLES.length];
            return (
              <FeatureCard key={feature.title} feature={feature} style={style} />
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature, style }: { feature: Feature; style: FeatureStyle }) {
  return (
    <div className="group p-7 bg-white rounded-[18px] border border-[#F1F5F9] hover:-translate-y-1 hover:shadow-[0_24px_40px_-20px_rgba(15,23,42,0.16)] hover:border-[#E2E8F0] transition-all duration-200 cursor-default">
      <div
        className="w-12 h-12 rounded-[14px] grid place-items-center mb-5"
        style={{ background: style.bg, color: style.tint }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
          {style.icon}
        </svg>
      </div>
      <h3 className="text-[18px] font-black tracking-tight text-text-primary mb-2">
        {feature.title}
      </h3>
      <p className="text-sm font-medium leading-relaxed text-text-secondary text-pretty">
        {feature.description}
      </p>
    </div>
  );
}
