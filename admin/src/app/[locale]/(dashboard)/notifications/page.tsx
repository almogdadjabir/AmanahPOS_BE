import { Suspense } from 'react';
import { getTranslations } from 'next-intl/server';
import { Bell } from 'lucide-react';
import { TableSkeleton } from '@/components/ds/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SectionError } from '@/components/SectionError';
import NotificationsDrawerShell from './_components/NotificationsDrawerShell';
import NotificationsControls from './_components/NotificationsControls';
import NotificationsLogsTable from './_components/NotificationsLogsTable';

interface Props {
  searchParams: Promise<{
    search?:  string;
    channel?: string;
    status?:  string;
    page?:    string;
  }>;
}

export default async function NotificationsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page   = Math.max(1, Number(params.page) || 1);
  const t      = await getTranslations('notifications');

  const tableKey = JSON.stringify(params);

  return (
    <NotificationsDrawerShell>
      <div>
        <div className="flex items-start justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:size-5">
              <Bell />
            </span>
            <div>
              <h1 className="text-[22px] font-black text-foreground tracking-tight leading-tight">
                {t('title')}
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">{t('description')}</p>
            </div>
          </div>
        </div>

        <ErrorBoundary fallback={<SectionError message="Failed to load controls" />}>
          <Suspense fallback={<div className="h-14 rounded-xl bg-muted animate-pulse mb-5" />}>
            <NotificationsControls />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary fallback={<SectionError message="Failed to load notification logs" />}>
          <Suspense key={tableKey} fallback={<TableSkeleton rows={8} cols={6} />}>
            <NotificationsLogsTable
              search={params.search}
              channel={params.channel}
              status={params.status}
              page={page}
            />
          </Suspense>
        </ErrorBoundary>
      </div>
    </NotificationsDrawerShell>
  );
}
