'use client';

import { useTranslations } from 'next-intl';
import Link from 'next/link';
import Logo from '@/components/ui/Logo';

export default function Error({
  error: _error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('error');

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <Logo size={56} className="mb-8" />

      <h1 className="text-2xl font-black tracking-tight text-text-primary">
        {t('title')}
      </h1>

      <p className="mt-3 max-w-sm text-base font-medium leading-relaxed text-text-secondary">
        {t('description')}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white text-sm font-bold rounded-xl hover:bg-primary/90 transition-colors"
        >
          {t('retry')}
        </button>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 border border-[#E2E8F0] text-text-primary text-sm font-bold rounded-xl hover:border-[#CBD5E1] transition-colors"
        >
          {t('cta')}
        </Link>
      </div>
    </div>
  );
}
