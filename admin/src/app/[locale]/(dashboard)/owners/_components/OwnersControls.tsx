'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import SearchInput from '@/components/ds/SearchInput';

const STATUS_TABS = [
  { label: 'All',      value: 'all'      },
  { label: 'Active',   value: 'active'   },
  { label: 'Inactive', value: 'inactive' },
] as const;

const SUB_TABS = [
  { label: 'Any plan',  value: 'all'  },
  { label: 'Has plan',  value: 'yes'  },
  { label: 'No plan',   value: 'no'   },
] as const;

export default function OwnersControls() {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const status = searchParams.get('status') ?? 'all';
  const sub    = searchParams.get('sub') ?? 'all';

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 mb-4">
      <div className="flex items-center gap-3 flex-wrap">
        <SearchInput
          placeholder="Search by name, phone, or email…"
          className="w-full sm:w-72"
        />

        {/* Status filter */}
        <div className="flex items-center gap-0.5 bg-surface-soft rounded-lg p-0.5">
          {STATUS_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setParam('status', t.value)}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                status === t.value
                  ? 'bg-white text-text-primary shadow-sm'
                  : 'text-text-hint hover:text-text-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Subscription filter */}
        <div className="flex items-center gap-0.5 bg-surface-soft rounded-lg p-0.5">
          {SUB_TABS.map(t => (
            <button
              key={t.value}
              onClick={() => setParam('sub', t.value)}
              className={`px-3 py-1 rounded-md text-[11px] font-semibold transition-all ${
                sub === t.value
                  ? 'bg-white text-text-primary shadow-sm'
                  : 'text-text-hint hover:text-text-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
