'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { X, Search } from 'lucide-react';
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from '@/components/ui/select';
import type { ActivityAction, ActivityEntityType } from '@/types/api';

export default function ActivityFilters() {
  const t            = useTranslations('activityLog');
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const debounceRef  = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const inputCls = 'h-9 w-full rounded-lg border border-input bg-background px-3 text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow';
  const labelCls = 'text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground select-none mb-1 block';

  return (
    <div className="space-y-2">
      {/* Row 1: search — always full width */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
        <input
          type="search"
          placeholder={t('searchPlaceholder')}
          defaultValue={search}
          onChange={(e) => handleSearch(e.target.value)}
          className={`${inputCls} pl-8`}
        />
      </div>

      {/* Row 2: selects + date range + clear — wraps on small screens */}
      <div className="flex flex-wrap items-end gap-2">
        {/* Action filter */}
        <div className="flex-1 min-w-[150px] max-w-[220px]">
          <Select value={action} onValueChange={(v) => update('action', v === '__all__' ? '' : v)}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder={t('actions.all')} />
            </SelectTrigger>
            <SelectContent>
              {ACTIONS.map((a) => (
                <SelectItem key={a.value} value={a.value || '__all__'}>{a.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Entity type filter */}
        <div className="flex-1 min-w-[130px] max-w-[180px]">
          <Select value={entityType} onValueChange={(v) => update('entity_type', v === '__all__' ? '' : v)}>
            <SelectTrigger className="h-9 w-full">
              <SelectValue placeholder={t('entities.all')} />
            </SelectTrigger>
            <SelectContent>
              {ENTITY_TYPES.map((e) => (
                <SelectItem key={e.value} value={e.value || '__all__'}>{e.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Date range — paired group that wraps together */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="flex flex-col">
            <span className={labelCls}>{t('fromDate')}</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => update('from_date', e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-2.5 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow w-[130px]"
            />
          </div>
          <span className="text-muted-foreground text-[11px] mt-4 shrink-0">—</span>
          <div className="flex flex-col">
            <span className={labelCls}>{t('toDate')}</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => update('to_date', e.target.value)}
              className="h-9 rounded-lg border border-input bg-background px-2.5 text-[12px] text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40 transition-shadow w-[130px]"
            />
          </div>
        </div>

        {/* Clear — only when filters active */}
        {hasFilters && (
          <button
            onClick={clearAll}
            className="h-9 inline-flex items-center gap-1.5 px-3 rounded-lg border border-border text-[12px] font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0 self-end"
          >
            <X size={13} />
            {t('clearFilters')}
          </button>
        )}
      </div>
    </div>
  );
}
