'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { ActivityAction, ActivityEntityType } from '@/types/api';

const ACTIONS: { value: ActivityAction | ''; label: string }[] = [
  { value: '', label: 'All actions' },
  { value: 'owner_created',    label: 'Owner created' },
  { value: 'owner_updated',    label: 'Owner updated' },
  { value: 'owner_activated',   label: 'Owner activated' },
  { value: 'owner_deactivated', label: 'Owner deactivated' },
  { value: 'business_created',     label: 'Business created' },
  { value: 'business_updated',     label: 'Business updated' },
  { value: 'business_activated',   label: 'Business activated' },
  { value: 'business_deactivated', label: 'Business deactivated' },
  { value: 'subscription_created',     label: 'Subscription created' },
  { value: 'subscription_updated',     label: 'Subscription updated' },
  { value: 'subscription_deactivated', label: 'Subscription deactivated' },
  { value: 'plan_created',    label: 'Plan created' },
  { value: 'plan_updated',    label: 'Plan updated' },
  { value: 'plan_activated',   label: 'Plan activated' },
  { value: 'plan_deactivated', label: 'Plan deactivated' },
];

const ENTITY_TYPES: { value: ActivityEntityType | ''; label: string }[] = [
  { value: '', label: 'All entities' },
  { value: 'owner',        label: 'Owners' },
  { value: 'business',     label: 'Businesses' },
  { value: 'subscription', label: 'Subscriptions' },
  { value: 'plan',         label: 'Plans' },
];

export default function ActivityFilters() {
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  const update = useCallback((key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    p.delete('page');
    router.push(`${pathname}?${p.toString()}`);
  }, [router, pathname, searchParams]);

  const action     = searchParams.get('action')      ?? '';
  const entityType = searchParams.get('entity_type') ?? '';
  const search     = searchParams.get('search')      ?? '';
  const fromDate   = searchParams.get('from_date')   ?? '';
  const toDate     = searchParams.get('to_date')     ?? '';

  return (
    <div className="flex flex-wrap gap-2 mb-5">
      <input
        type="search"
        placeholder="Search by entity or actor..."
        defaultValue={search}
        onChange={(e) => update('search', e.target.value)}
        className="h-9 flex-1 min-w-[180px] max-w-xs rounded-lg border border-input bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
      />

      <select
        value={action}
        onChange={(e) => update('action', e.target.value)}
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 cursor-pointer"
      >
        {ACTIONS.map((a) => (
          <option key={a.value} value={a.value}>{a.label}</option>
        ))}
      </select>

      <select
        value={entityType}
        onChange={(e) => update('entity_type', e.target.value)}
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50 cursor-pointer"
      >
        {ENTITY_TYPES.map((t) => (
          <option key={t.value} value={t.value}>{t.label}</option>
        ))}
      </select>

      <input
        type="date"
        value={fromDate}
        onChange={(e) => update('from_date', e.target.value)}
        title="From date"
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
      />

      <input
        type="date"
        value={toDate}
        onChange={(e) => update('to_date', e.target.value)}
        title="To date"
        className="h-9 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring/50"
      />
    </div>
  );
}
