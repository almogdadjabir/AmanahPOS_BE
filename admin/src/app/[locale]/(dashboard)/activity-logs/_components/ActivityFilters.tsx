'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import type { ActivityAction, ActivityEntityType } from '@/types/api';

export default function ActivityFilters() {
  const t = useTranslations('activityLog');
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();

  const ACTIONS: { value: ActivityAction | ''; label: string }[] = [
    { value: '', label: t('actions.all') },
    { value: 'owner_created',          label: t('actions.owner_created') },
    { value: 'owner_updated',          label: t('actions.owner_updated') },
    { value: 'owner_activated',        label: t('actions.owner_activated') },
    { value: 'owner_deactivated',      label: t('actions.owner_deactivated') },
    { value: 'business_created',       label: t('actions.business_created') },
    { value: 'business_updated',       label: t('actions.business_updated') },
    { value: 'business_activated',     label: t('actions.business_activated') },
    { value: 'business_deactivated',   label: t('actions.business_deactivated') },
    { value: 'subscription_created',   label: t('actions.subscription_created') },
    { value: 'subscription_updated',   label: t('actions.subscription_updated') },
    { value: 'subscription_deactivated', label: t('actions.subscription_deactivated') },
    { value: 'plan_created',           label: t('actions.plan_created') },
    { value: 'plan_updated',           label: t('actions.plan_updated') },
    { value: 'plan_activated',         label: t('actions.plan_activated') },
    { value: 'plan_deactivated',       label: t('actions.plan_deactivated') },
  ];

  const ENTITY_TYPES: { value: ActivityEntityType | ''; label: string }[] = [
    { value: '',             label: t('entities.all') },
    { value: 'owner',        label: t('entities.owner') },
    { value: 'business',     label: t('entities.business') },
    { value: 'subscription', label: t('entities.subscription') },
    { value: 'plan',         label: t('entities.plan') },
  ];

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
        placeholder={t('searchPlaceholder')}
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
