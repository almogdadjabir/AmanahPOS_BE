import { Suspense } from 'react';
import { TableSkeleton } from '@/components/ds/Skeleton';

import SubscriptionsDrawerShell from './_components/SubscriptionsDrawerShell';
import SubscriptionsPageHeader from './_components/SubscriptionsPageHeader';
import SubscriptionsControls from './_components/SubscriptionsControls';
import SubscriptionsTable from './_components/SubscriptionsTable';

interface Props {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?:   string;
  }>;
}

export default async function SubscriptionsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page   = Math.max(1, Number(params.page) || 1);

  const tableKey = JSON.stringify({
    search: params.search,
    status: params.status,
    page:   params.page,
  });

  return (
    <SubscriptionsDrawerShell>
      <div>
        <SubscriptionsPageHeader />

        <Suspense fallback={<div className="h-14 rounded-xl bg-muted animate-pulse mb-5" />}>
          <SubscriptionsControls />
        </Suspense>

        <Suspense key={tableKey} fallback={<TableSkeleton rows={8} cols={7} />}>
          <SubscriptionsTable
            search={params.search}
            status={params.status}
            page={page}
          />
        </Suspense>
      </div>
    </SubscriptionsDrawerShell>
  );
}
