'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import SearchInput from '@/components/ds/SearchInput';

export default function StaffFilters() {
  const t = useTranslations('staff');
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [, start]    = useTransition();

  const activeStatus = searchParams.get('status') ?? '';
  const activeRole   = searchParams.get('role')   ?? '';

  const STATUS_TABS = [
    { label: t('tabAll'),      value: ''         },
    { label: t('tabActive'),   value: 'active'   },
    { label: t('tabInactive'), value: 'inactive' },
  ] as const;

  const ROLE_TABS = [
    { label: t('tabAllRoles'), value: ''        },
    { label: t('tabManager'),  value: 'manager' },
    { label: t('tabCashier'),  value: 'cashier' },
  ] as const;

  function update(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else       params.delete(key);
    params.delete('page');
    start(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      <SearchInput placeholder={t('searchPlaceholder')} className="w-full sm:w-64" />

      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted border border-border">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => update('status', tab.value)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150',
              activeStatus === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted border border-border">
        {ROLE_TABS.map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => update('role', tab.value)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150',
              activeRole === tab.value
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
