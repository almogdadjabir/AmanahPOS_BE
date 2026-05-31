'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import type { ActivityAction, ActivityEntityType } from '@/types/api';

export default function ActivityFilters() {
  const t           = useTranslations('activityLog');
  const router      = useRouter();
  const pathname    = usePathname();
  const searchParams = useSearchParams();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const action     = searchParams.get('action')      ?? '';
  const entityType = searchParams.get('entity_type') ?? '';
  const search     = searchParams.get('search')      ?? '';
  const fromDate   = searchParams.get('from_date')   ?? '';
  const toDate     = searchParams.get('to_date')     ?? '';

  const hasFilters = !!(action || entityType || search || fromDate || toDate);

  const ACTIONS: { value: ActivityAction | ''; label: string }[] = [
    { value: '', label: t('actions.all') },
    { value: 'owner_created',            label: t('actions.owner_created') },
    { value: 'owner_updated',            label: t('actions.owner_updated') },
    { value: 'owner_activated',          label: t('actions.owner_activated') },
    { value: 'owner_deactivated',        label: t('actions.owner_deactivated') },
    { value: 'business_created',         label: t('actions.business_created') },
    { value: 'business_updated',         label: t('actions.business_updated') },
    { value: 'business_activated',       label: t('actions.business_activated') },
    { value: 'business_deactivated',     label: t('actions.business_deactivated') },
    { value: 'subscription_created',     label: t('actions.subscription_created') },
    { value: 'subscription_updated',     label: t('actions.subscription_updated') },
    { value: 'subscription_deactivated', label: t('actions.subscription_deactivated') },
    { value: 'plan_created',             label: t('actions.plan_created') },
    { value: 'plan_updated',             label: t('actions.plan_updated') },
    { value: 'plan_activated',           label: t('actions.plan_activated') },
    { value: 'plan_deactivated',         label: t('actions.plan_deactivated') },
  ];

  const ENTITY_TYPES: { value: ActivityEntityType | ''; label: string }[] = [
    { value: '',             label: t('entities.all') },
    { value: 'owner',        label: t('entities.owner') },
    { value: 'business',     label: t('entities.business') },
    { value: 'subscription', label: t('entities.subscription') },
    { value: 'plan',         label: t('entities.plan') },
  ];

  const push = useCallback((params: URLSearchParams) => {
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }, [router, pathname]);

  const update = useCallback((key: string, value: string) => {
    const p = new URLSearchParams(searchParams.toString());
    if (value) p.set(key, value); else p.delete(key);
    push(p);
  }, [searchParams, push]);

  const handleSearch = useCallback((value: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const p = new URLSearchParams(searchParams.toString());
      if (value) p.set('search', value); else p.delete('search');
      push(p);
    }, 400);
  }, [searchParams, push]);

  const clearAll = useCallback(() => {
    router.push(pathname);
  }, [router, pathname]);

  const inputCls = 'h-9 rounded-lg border border-input bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow';
  const selectCls = `${inputCls} cursor-pointer`;

  return (
    <div className="flex flex-wrap items-center gap-2 mb-5">
      {/* Search */}
      <input
        type="search"
        placeholder={t('searchPlaceholder')}
        defaultValue={search}
        onChange={(e) => handleSearch(e.target.value)}
        className={`${inputCls} flex-1 min-w-[180px] max-w-xs`}
      />

      {/* Action filter */}
      <select
        value={action}
        onChange={(e) => update('action', e.target.value)}
        className={selectCls}
      >
        {ACTIONS.map((a) => (
          <option key={a.value} value={a.value}>{a.label}</option>
        ))}
      </select>

      {/* Entity type filter */}
      <select
        value={entityType}
        onChange={(e) => update('entity_type', e.target.value)}
        className={selectCls}
      >
        {ENTITY_TYPES.map((e) => (
          <option key={e.value} value={e.value}>{e.label}</option>
        ))}
      </select>

      {/* Date range */}
      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground font-medium shrink-0">{t('fromDate')}</span>
        <input
          type="date"
          value={fromDate}
          onChange={(e) => update('from_date', e.target.value)}
          className={`${inputCls} w-36`}
        />
      </div>

      <div className="flex items-center gap-1.5">
        <span className="text-[11px] text-muted-foreground font-medium shrink-0">{t('toDate')}</span>
        <input
          type="date"
          value={toDate}
          onChange={(e) => update('to_date', e.target.value)}
          className={`${inputCls} w-36`}
        />
      </div>

      {/* Clear button — only when filters are active */}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border border-border text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X size={13} />
          {t('clearFilters')}
        </button>
      )}
    </div>
  );
}
