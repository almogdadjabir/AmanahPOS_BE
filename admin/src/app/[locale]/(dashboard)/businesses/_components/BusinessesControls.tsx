'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import SearchInput from '@/components/ds/SearchInput';
import { cn } from '@/lib/utils';

function TabGroup<T extends string>({
  label, tabs, value, onChange,
}: {
  label:    string;
  tabs:     readonly { label: string; value: T }[];
  value:    T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10.5px] font-semibold text-muted-foreground uppercase tracking-wider shrink-0 select-none">
        {label}
      </span>
      <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
        {tabs.map(tab => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onChange(tab.value)}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150',
              tab.value === value
                ? 'bg-card text-foreground shadow-sm'
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

export default function BusinessesControls() {
  const t = useTranslations('businesses');
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const status = (searchParams.get('status') ?? 'all') as 'all' | 'active' | 'inactive';
  const sub    = (searchParams.get('sub') ?? 'all')    as 'all' | 'yes' | 'no';

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') params.delete(key);
    else                 params.set(key, value);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  const statusTabs = [
    { label: t('tabAll'),      value: 'all'      },
    { label: t('tabActive'),   value: 'active'   },
    { label: t('tabInactive'), value: 'inactive' },
  ] as const;

  const subTabs = [
    { label: t('tabAnyPlan'), value: 'all' },
    { label: t('tabHasPlan'), value: 'yes' },
    { label: t('tabNoPlan'),  value: 'no'  },
  ] as const;

  return (
    <div className="flex items-center gap-4 flex-wrap mb-4 p-3 bg-card rounded-xl border border-border shadow-xs">
      <SearchInput placeholder={t('searchPlaceholder')} className="w-full sm:w-72" />
      <div className="h-4 w-px bg-border hidden sm:block" />
      <TabGroup label={t('statusLabel')} tabs={statusTabs} value={status} onChange={(v) => setParam('status', v)} />
      <div className="h-4 w-px bg-border hidden sm:block" />
      <TabGroup label={t('planLabel')} tabs={subTabs} value={sub} onChange={(v) => setParam('sub', v)} />
    </div>
  );
}
