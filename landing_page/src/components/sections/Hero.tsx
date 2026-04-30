import { getTranslations } from 'next-intl/server';
import Button from '@/components/ui/Button';
import Eyebrow from '@/components/ui/Eyebrow';

type Stat = { value: string; label: string };

export default async function Hero() {
  const t = await getTranslations('hero');
  const tRoot = await getTranslations();
  const stats = tRoot.raw('heroStats') as Stat[];

  return (
    <section className="relative overflow-hidden py-16 pb-36 bg-hero-gradient">
      <div className="container-page grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-14 items-center">
        {/* Copy */}
        <div>
          <Eyebrow>{t('eyebrow')}</Eyebrow>

          <h1 className="mt-5 text-[clamp(36px,5.5vw,62px)] font-black leading-[1.04] tracking-[-1.5px] text-text-primary text-balance">
            {t('title')}{' '}
            <span className="text-primary">{t('titleAccent')}</span>
          </h1>

          <p className="mt-5 max-w-xl text-lg font-medium leading-[1.6] text-text-secondary text-pretty">
            {t('description')}
          </p>

          <div className="flex flex-wrap gap-3 mt-8">
            <Button as="a" href="#signup" variant="primary" size="lg">
              {t('ctaPrimary')}
              <ArrowIcon />
            </Button>
            <Button as="a" href="#how" size="lg">
              <PlayIcon />
              {t('ctaSecondary')}
            </Button>
          </div>

          {/* Stats */}
          <div className="mt-10 flex flex-wrap gap-8 pt-7 border-t border-[#F1F5F9]">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="text-[22px] font-black tracking-tight text-text-primary">
                  {stat.value}
                </div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-text-secondary mt-0.5">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Phone mockup */}
        <PhoneMockup />
      </div>
    </section>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flip-rtl">
      <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
      <path d="M10 8.5v7l6-3.5-6-3.5Z" fill="currentColor" />
    </svg>
  );
}

function PhoneMockup() {
  const receiptItems = [
    ['Cappuccino ×2', '4,400'],
    ['Karak Tea', '1,200'],
    ['Croissant', '1,800'],
  ];
  const products = [
    ['Cappuccino', 2200],
    ['Karak Tea', 1200],
    ['Croissant', 1800],
    ['Latte', 2400],
  ] as const;

  return (
    <div className="relative aspect-[0.95] max-w-[420px] mx-auto w-full">
      {/* Floating receipt card */}
      <div className="absolute top-[6%] start-[-4%] w-52 p-4 bg-white rounded-[18px] border border-[#F1F5F9] shadow-[0_30px_60px_-20px_rgba(15,23,42,0.18)] z-30 -rotate-[4deg]">
        <div className="flex items-center gap-2 mb-3.5">
          <div className="w-8 h-8 rounded-lg bg-success-light text-success grid place-items-center shrink-0">
            <CheckIcon />
          </div>
          <div>
            <div className="text-[11px] font-extrabold text-text-primary">Sale complete</div>
            <div className="text-[9px] font-semibold text-text-secondary">#ORD-2451 · 12:42</div>
          </div>
        </div>
        <div className="border-t border-dashed border-[#E2E8F0] pt-3 space-y-1">
          {receiptItems.map(([name, price]) => (
            <div key={name} className="flex justify-between text-[10px] font-semibold text-text-secondary">
              <span>{name}</span>
              <span className="text-text-primary font-bold">{price}</span>
            </div>
          ))}
          <div className="flex justify-between items-baseline pt-2.5 mt-1 border-t border-[#F1F5F9]">
            <span className="text-[10px] font-bold text-text-secondary">Total</span>
            <span className="text-lg font-black tracking-tight text-text-primary">
              7,400 <span className="text-[9px] text-text-secondary font-bold">SDG</span>
            </span>
          </div>
        </div>
      </div>

      {/* Phone frame */}
      <div className="absolute inset-0 mx-auto w-[55%] aspect-[0.48] bg-[#0F172A] rounded-phone p-2 shadow-[0_50px_100px_-20px_rgba(15,23,42,0.35)] z-20">
        <div className="w-full h-full bg-[#F8FAFC] rounded-[36px] overflow-hidden relative">
          {/* App bar */}
          <div className="flex items-center gap-2 px-3.5 pt-5 pb-2 bg-white border-b border-[#F1F5F9]">
            <div className="w-5 h-5 rounded-md bg-primary grid place-items-center shrink-0">
              <svg width="10" height="10" viewBox="0 0 36 36" fill="none">
                <path d="M10 24V14a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10M7 24h22" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
              </svg>
            </div>
            <div>
              <div className="text-[9px] font-black text-text-primary">AmanaPOS</div>
              <div className="text-[7px] font-semibold text-text-secondary">Khartoum · Reg #2</div>
            </div>
          </div>

          {/* Category tabs */}
          <div className="flex gap-1.5 px-3 py-2.5">
            {(['All', 'Coffee', 'Tea'] as const).map((label, i) => (
              <div key={label} className={`px-2.5 py-1 rounded-full text-[8px] font-extrabold border ${i === 0 ? 'bg-primary text-white border-primary' : 'bg-white text-text-primary border-[#E2E8F0]'}`}>
                {label}
              </div>
            ))}
          </div>

          {/* Product grid */}
          <div className="grid grid-cols-2 gap-1.5 px-3">
            {products.map(([name, price]) => (
              <div key={name} className="bg-white rounded-[10px] p-1.5 border border-[#E2E8F0]">
                <div className="aspect-[1.3] bg-gradient-to-br from-[#F1F5F9] to-[#F8FAFC] rounded-md mb-1" />
                <div className="text-[7px] font-extrabold text-text-primary">{name}</div>
                <div className="text-[7px] font-bold text-text-primary mt-0.5">
                  {price} <span className="text-[5px] text-text-hint">SDG</span>
                </div>
              </div>
            ))}
          </div>

          {/* Cart bar */}
          <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-[20px] px-3.5 py-2.5 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-primary-light grid place-items-center shrink-0">
              <CartIcon />
            </div>
            <div className="flex-1">
              <div className="text-[7px] font-bold text-text-secondary">4 items</div>
              <div className="text-[12px] font-black tracking-tight text-text-primary">
                7,400 <span className="text-[6px] text-text-secondary font-bold">SDG</span>
              </div>
            </div>
            <div className="px-2.5 py-1.5 bg-primary text-white rounded-lg text-[8px] font-black">
              View cart
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="m5 12 5 5L20 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CartIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
      <path d="M3 4h2l2.4 12.4a2 2 0 0 0 2 1.6h7.4a2 2 0 0 0 2-1.6L21 7H6" stroke="#0F766E" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
