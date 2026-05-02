import { Suspense } from 'react';
import PageTitle from '@/components/ds/PageTitle';
import { TableSkeleton } from '@/components/ds/Skeleton';
import OwnersTable from './_components/OwnersTable';
import OwnersControls from './_components/OwnersControls';
import OwnersDrawerShell from './_components/OwnersDrawerShell';
import CreateOwnerButton from './_components/CreateOwnerButton';

interface Props {
  searchParams: Promise<{ search?: string; status?: string; sub?: string; page?: string }>;
}

export default async function OwnersPage({ searchParams }: Props) {
  const params = await searchParams;
  const page = Math.max(1, Number(params.page) || 1);

  // Key only on table-relevant params — drawer open/close never changes this
  const tableKey = JSON.stringify({
    search: params.search,
    status: params.status,
    sub:    params.sub,
    page:   params.page,
  });

  return (
    // OwnersDrawerShell is a client component that:
    // - Holds drawer state in React (no URL changes)
    // - Provides openView/openCreate via context to child client components
    // - Renders {children} untouched — no re-render on drawer open/close
    <OwnersDrawerShell>
      <div>
        <div className="flex items-start justify-between mb-5">
          <PageTitle
            title="Owners"
            description="All business owners registered on the platform."
          />
          {/* Client component — calls openCreate() from context, no navigation */}
          <CreateOwnerButton />
        </div>

        {/* OwnersControls uses useSearchParams — needs Suspense */}
        <Suspense fallback={<div className="h-10 rounded-lg bg-surface-soft animate-pulse mb-4" />}>
          <OwnersControls />
        </Suspense>

        {/* Table key excludes drawer params → table never re-fetches on drawer open/close */}
        <Suspense key={tableKey} fallback={<TableSkeleton rows={8} cols={7} />}>
          <OwnersTable
            search={params.search}
            status={params.status}
            sub={params.sub}
            page={page}
          />
        </Suspense>
      </div>
    </OwnersDrawerShell>
  );
}
