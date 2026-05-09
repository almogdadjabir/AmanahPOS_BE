import { Suspense } from 'react';
import { TableSkeleton } from '@/components/ds/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SectionError } from '@/components/SectionError';

import BusinessesDrawerShell from './_components/BusinessesDrawerShell';
import BusinessesPageHeader from './_components/BusinessesPageHeader';
import BusinessesControls from './_components/BusinessesControls';
import BusinessesTable from './_components/BusinessesTable';

interface Props {
  searchParams: Promise<{
    search?: string;
    status?: string;
    sub?:    string;
    page?:   string;
  }>;
}

export default async function BusinessesPage({ searchParams }: Props) {
  const params = await searchParams;
  const page   = Math.max(1, Number(params.page) || 1);

  const tableKey = JSON.stringify({
    search: params.search,
    status: params.status,
    sub:    params.sub,
    page:   params.page,
  });

  return (
    <BusinessesDrawerShell>
      <div>
        <BusinessesPageHeader />

        <ErrorBoundary fallback={<SectionError message="Failed to load filters" />}>
          <Suspense fallback={<div className="h-14 rounded-xl bg-muted animate-pulse mb-5" />}>
            <BusinessesControls />
          </Suspense>
        </ErrorBoundary>

        <ErrorBoundary fallback={<SectionError message="Failed to load businesses" />}>
          <Suspense key={tableKey} fallback={<TableSkeleton rows={8} cols={7} />}>
            <BusinessesTable
              search={params.search}
              status={params.status}
              sub={params.sub}
              page={page}
            />
          </Suspense>
        </ErrorBoundary>
      </div>
    </BusinessesDrawerShell>
  );
}
