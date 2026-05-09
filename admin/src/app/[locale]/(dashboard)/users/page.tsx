import { Suspense } from 'react';
import { TableSkeleton } from '@/components/ds/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SectionError } from '@/components/SectionError';
import StaffDrawerShell from './_components/StaffDrawerShell';
import StaffPageHeader from './_components/StaffPageHeader';
import StaffStats, { StaffStatsSkeleton } from './_components/StaffStats';
import StaffFilters from './_components/StaffFilters';
import StaffTable from './_components/StaffTable';
import { fetchBusiness } from '@/services/owner';

interface Props {
  searchParams: Promise<{
    search?: string;
    status?: string;
    role?:   string;
    page?:   string;
  }>;
}

export default async function UsersPage({ searchParams }: Props) {
  const params   = await searchParams;
  const page     = Math.max(1, Number(params.page) || 1);
  const tableKey = JSON.stringify({ search: params.search, status: params.status, role: params.role, page });

  const bizRes = await fetchBusiness();
  const shops  = bizRes?.data?.[0]?.shops ?? [];

  return (
    <StaffDrawerShell shops={shops}>
      <StaffPageHeader />

      <ErrorBoundary fallback={<SectionError message="Failed to load staff stats" />}>
        <Suspense fallback={<StaffStatsSkeleton />}>
          <StaffStats />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionError message="Failed to load filters" />}>
        <Suspense fallback={<div className="h-[52px] rounded-xl bg-muted animate-pulse mb-5" />}>
          <StaffFilters />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionError message="Failed to load staff" />}>
        <Suspense key={tableKey} fallback={<TableSkeleton rows={8} cols={5} />}>
          <StaffTable
            search={params.search}
            status={params.status}
            role={params.role}
            page={page}
            shops={shops}
          />
        </Suspense>
      </ErrorBoundary>
    </StaffDrawerShell>
  );
}
