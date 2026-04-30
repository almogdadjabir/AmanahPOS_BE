import { getTranslations } from 'next-intl/server';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';

export default async function NotFound() {
  const t = await getTranslations('notFound');

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <Logo size={56} className="mb-8" />

      <p className="text-[clamp(80px,15vw,140px)] font-black leading-none text-[#F1F5F9] select-none">
        404
      </p>

      <h1 className="mt-4 text-2xl font-black tracking-tight text-text-primary">
        {t('title')}
      </h1>

      <p className="mt-3 max-w-sm text-base font-medium leading-relaxed text-text-secondary">
        {t('description')}
      </p>

      <Link
        href="/"
        className="mt-8 inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors"
      >
        {t('cta')}
      </Link>
    </div>
  );
}
