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
      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em] shrink-0">
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

export default function SubscriptionsControls() {
  const t = useTranslations('subscriptions');
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const status = (searchParams.get('status') ?? 'all') as 'all' | 'active' | 'expired';

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') params.delete(key);
    else                 params.set(key, value);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  const statusTabs = [
    { label: t('tabAll'),     value: 'all'     },
    { label: t('tabActive'),  value: 'active'  },
    { label: t('tabExpired'), value: 'expired' },
  ] as const;

  return (
    <div className="flex items-center gap-4 flex-wrap mb-5 p-3 bg-card rounded-xl border border-border shadow-card">
      <SearchInput
        placeholder={t('searchPlaceholder')}
        className="w-full sm:w-72"
      />
      <div className="h-4 w-px bg-border hidden sm:block" />
      <TabGroup
        label={t('statusLabel')}
        tabs={statusTabs}
        value={status}
        onChange={(v) => setParam('status', v)}
      />
    </div>
  );
}
