import { Suspense } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { fetchActivityLogs } from '@/services/admin';
import type { ActivityAction, ActivityEntityType } from '@/types/api';
import ActivityFeed       from './_components/ActivityFeed';
import ActivityFilters    from './_components/ActivityFilters';
import ActivityPagination from './_components/ActivityPagination';
import { Bone, TableSkeleton } from '@/components/ds/Skeleton';

const PAGE_SIZE = 25;

interface Props {
  searchParams: Promise<{
    search?:      string;
    action?:      string;
    entity_type?: string;
    actor_id?:    string;
    from_date?:   string;
    to_date?:     string;
    page?:        string;
  }>;
}

async function ActivityContent({ searchParams }: Props) {
  const params = await searchParams;
  const page   = Math.max(1, Number(params.page) || 1);

  const data = await fetchActivityLogs({
    page,
    page_size:   PAGE_SIZE,
    search:      params.search,
    action:      params.action as ActivityAction | undefined,
    entity_type: params.entity_type as ActivityEntityType | undefined,
    actor_id:    params.actor_id,
    from_date:   params.from_date,
    to_date:     params.to_date,
  });

  const logs  = data?.results  ?? [];
  const count = data?.count    ?? 0;

  return (
    <>
      <ActivityFeed logs={logs} />
      <ActivityPagination count={count} currentPage={page} pageSize={PAGE_SIZE} />
    </>
  );
}

export default async function ActivityLogsPage(props: Props) {
  const [t, locale] = await Promise.all([
    getTranslations('activityLog'),
    getLocale(),
  ]);

  const now = new Date();
  const dateStr = now.toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="space-y-4">
      {/* Fix: simple title header, no big icon */}
      <div>
        <h1 className="text-[21px] font-semibold text-foreground tracking-[-.025em] leading-tight">
          {t('title')}
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">{dateStr}</p>
      </div>

      {/* Filters */}
      <Suspense fallback={
        <div className="space-y-2">
          <Bone className="h-9 w-full rounded-lg" />
          <div className="flex flex-wrap gap-2">
            <Bone className="h-9 flex-1 min-w-[140px] rounded-lg" />
            <Bone className="h-9 flex-1 min-w-[120px] rounded-lg" />
            <Bone className="h-9 flex-1 min-w-[140px] rounded-lg" />
            <Bone className="h-9 flex-1 min-w-[140px] rounded-lg" />
          </div>
        </div>
      }>
        <ActivityFilters />
      </Suspense>

      {/* Feed card — Fix: shadow-xs + solid border */}
      <div className="rounded-xl border border-border bg-card shadow-xs p-5">
        <Suspense fallback={<TableSkeleton rows={8} cols={1} />}>
          <ActivityContent searchParams={props.searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
