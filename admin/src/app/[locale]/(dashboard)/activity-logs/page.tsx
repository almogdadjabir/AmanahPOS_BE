import { Suspense } from 'react';
import { History } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
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
  const t = await getTranslations('activityLog');
  return (
    <div>
      {/* Page header */}
      <div className="flex items-start gap-3 mb-6">
        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:size-5">
          <History />
        </span>
        <div>
          <h1 className="text-[22px] font-black text-foreground tracking-tight leading-tight">
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {t('description')}
          </p>
        </div>
      </div>

      {/* Filters (client — needs useSearchParams) */}
      <Suspense fallback={
        <div className="flex flex-wrap gap-2 mb-5">
          <Bone className="h-9 flex-1 min-w-[180px] max-w-xs rounded-lg" />
          <Bone className="h-9 w-36 rounded-lg" />
          <Bone className="h-9 w-32 rounded-lg" />
          <Bone className="h-9 w-32 rounded-lg" />
          <Bone className="h-9 w-32 rounded-lg" />
        </div>
      }>
        <ActivityFilters />
      </Suspense>

      {/* Feed */}
      <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm">
        <Suspense fallback={<TableSkeleton rows={8} cols={1} />}>
          <ActivityContent searchParams={props.searchParams} />
        </Suspense>
      </div>
    </div>
  );
}
