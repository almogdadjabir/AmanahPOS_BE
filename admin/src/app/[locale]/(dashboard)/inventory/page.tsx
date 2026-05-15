import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { TableSkeleton } from '@/components/ds/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SectionError } from '@/components/SectionError';
import InventoryDrawerShell from './_components/InventoryDrawerShell';
import InventoryPageHeader from './_components/InventoryPageHeader';
import InventoryStats, { InventoryStatsSkeleton } from './_components/InventoryStats';
import InventoryFilters from './_components/InventoryFilters';
import InventoryTable from './_components/InventoryTable';
import InboundReceivingPanel from './_components/InboundReceivingPanel';
import { fetchBusiness, fetchUserProfile } from '@/services/owner';

interface Props {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?:   string;
  }>;
}

export default async function InventoryPage({ searchParams }: Props) {
  const [bizRes, profileRes] = await Promise.all([fetchBusiness(), fetchUserProfile()]);
  if (bizRes?.data?.[0]?.business_type !== 'shop') notFound();

  const params   = await searchParams;
  const page     = Math.max(1, Number(params.page) || 1);
  const tableKey = JSON.stringify({ search: params.search, status: params.status, page });

  const isInboundEnabled = Boolean(
    profileRes?.data?.enabled_features?.inventory_inbound_receiving,
  );
  const shops = bizRes?.data?.[0]?.shops ?? [];

  return (
    <InventoryDrawerShell>
      <InventoryPageHeader />

      <InboundReceivingPanel enabled={isInboundEnabled} shops={shops} />

      <ErrorBoundary fallback={<SectionError message="Failed to load inventory stats" />}>
        <Suspense fallback={<InventoryStatsSkeleton />}>
          <InventoryStats />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionError message="Failed to load filters" />}>
        <Suspense fallback={<div className="h-[52px] rounded-xl bg-muted animate-pulse mb-5" />}>
          <InventoryFilters />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionError message="Failed to load inventory" />}>
        <Suspense key={tableKey} fallback={<TableSkeleton rows={8} cols={6} />}>
          <InventoryTable
            search={params.search}
            status={params.status}
            page={page}
          />
        </Suspense>
      </ErrorBoundary>
    </InventoryDrawerShell>
  );
}
