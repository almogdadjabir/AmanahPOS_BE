import { getTranslations } from 'next-intl/server';
import Button from '@/components/ui/Button';
import Eyebrow from '@/components/ui/Eyebrow';

export default async function Download() {
  const t = await getTranslations('download');

  return (
    <section id="download" className="relative py-24 bg-deep overflow-hidden">
      <div className="absolute inset-0 bg-download-gradient pointer-events-none" />

      <div className="container-page relative text-center max-w-[720px] mx-auto">
        <Eyebrow dark>{t('eyebrow')}</Eyebrow>

        <h2 className="mt-4 text-[clamp(28px,3.5vw,44px)] font-black leading-tight tracking-tight text-white text-balance mt-5">
          {t('title')}
        </h2>

        <p className="mt-4 text-[17px] font-medium leading-relaxed text-white/60">
          {t('subtitle')}
        </p>

        <div className="flex justify-center flex-wrap gap-3 mt-8">
          <Button as="a" href="#ios" variant="dark" size="lg">
            <AppleIcon />
            {t('ios')}
          </Button>
          <Button as="a" href="#android" variant="dark" size="lg">
            <PlayStoreIcon />
            {t('android')}
          </Button>
          <Button as="a" href="#signup" variant="primary" size="lg">
            {t('web')}
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="flip-rtl">
              <path d="M5 12h14M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Button>
        </div>
      </div>
    </section>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.5 12.5c0-2 1.5-3 1.5-3s-1-2-3-2c-1.5 0-2.5 1-3 1s-1.5-1-3-1c-2 0-4 1.5-4 4.5 0 4 3 7 4.5 7 1 0 1.5-1 2.5-1s1.5 1 2.5 1c1.5 0 4-3 4-5.5 0-1-1-1-1-1ZM14 5c1-1 1-2.5 1-2.5s-1.5 0-2.5 1-1 2.5-1 2.5 1.5 0 2.5-1Z" />
    </svg>
  );
}

function PlayStoreIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.5 4.5a1 1 0 0 0-1.5.87v13.26a1 1 0 0 0 1.5.87l12-6.63a1 1 0 0 0 0-1.74l-12-6.63Z" />
    </svg>
  );
}
