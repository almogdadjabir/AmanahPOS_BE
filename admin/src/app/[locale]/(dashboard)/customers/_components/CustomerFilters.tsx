'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTransition } from 'react';
import { cn } from '@/lib/utils';
import SearchInput from '@/components/ds/SearchInput';

const STATUS_TABS = [
  { label: 'All',      value: ''         },
  { label: 'Active',   value: 'active'   },
  { label: 'Inactive', value: 'inactive' },
] as const;

export default function CustomerFilters() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [, start]    = useTransition();

  const activeStatus = searchParams.get('status') ?? '';

  function setStatus(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set('status', value);
    else       params.delete('status');
    params.delete('page');
    start(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-wrap items-center gap-3 mb-5">
      <SearchInput placeholder="Search by name or phone…" className="w-full sm:w-64" />

      <div className="flex items-center gap-1 p-1 rounded-lg bg-muted border border-border">
        {STATUS_TABS.map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => setStatus(tab.value)}
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
    </div>
  );
}
