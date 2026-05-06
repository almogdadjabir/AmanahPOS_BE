import { Suspense } from 'react';
import { TableSkeleton } from '@/components/ds/Skeleton';
import InventoryDrawerShell from './_components/InventoryDrawerShell';
import InventoryPageHeader from './_components/InventoryPageHeader';
import InventoryStats, { InventoryStatsSkeleton } from './_components/InventoryStats';
import InventoryFilters from './_components/InventoryFilters';
import InventoryTable from './_components/InventoryTable';

interface Props {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?:   string;
  }>;
}

export default async function InventoryPage({ searchParams }: Props) {
  const params  = await searchParams;
  const page    = Math.max(1, Number(params.page) || 1);
  const tableKey = JSON.stringify({ search: params.search, status: params.status, page });

  return (
    <InventoryDrawerShell>
      <InventoryPageHeader />

      <Suspense fallback={<InventoryStatsSkeleton />}>
        <InventoryStats />
      </Suspense>

      <Suspense fallback={<div className="h-[52px] rounded-xl bg-muted animate-pulse mb-5" />}>
        <InventoryFilters />
      </Suspense>

      <Suspense key={tableKey} fallback={<TableSkeleton rows={8} cols={6} />}>
        <InventoryTable
          search={params.search}
          status={params.status}
          page={page}
        />
      </Suspense>
    </InventoryDrawerShell>
  );
}
