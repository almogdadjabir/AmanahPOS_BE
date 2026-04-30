'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { useTransition } from 'react';

const LOCALE_META = {
  ar: { flag: '🇸🇩', label: 'عربي' },
  en: { flag: '🇺🇸', label: 'EN' },
} as const;

export default function LocaleSwitcher() {
  const locale = useLocale() as 'ar' | 'en';
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const target = locale === 'ar' ? 'en' : 'ar';
  const { flag, label } = LOCALE_META[target];

  function switchLocale() {
    const newPath = pathname.replace(`/${locale}`, `/${target}`);
    startTransition(() => router.replace(newPath));
  }

  return (
    <button
      onClick={switchLocale}
      disabled={isPending}
      aria-label={`Switch to ${target}`}
      className="flex items-center gap-1.5 px-3 h-9 rounded-xl border border-[#E2E8F0] bg-white text-xs font-bold text-text-secondary hover:border-[#CBD5E1] hover:text-text-primary transition-colors disabled:opacity-50 select-none"
    >
      <span className="text-base leading-none">{flag}</span>
      <span>{label}</span>
    </button>
  );
}
