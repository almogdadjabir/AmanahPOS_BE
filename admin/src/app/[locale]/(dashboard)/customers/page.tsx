import { Suspense } from 'react';
import { TableSkeleton } from '@/components/ds/Skeleton';
import CustomerDrawerShell from './_components/CustomerDrawerShell';
import CustomerPageHeader from './_components/CustomerPageHeader';
import CustomerStats, { CustomerStatsSkeleton } from './_components/CustomerStats';
import CustomerFilters from './_components/CustomerFilters';
import CustomersTable from './_components/CustomersTable';

interface Props {
  searchParams: Promise<{
    search?: string;
    status?: string;
    page?:   string;
  }>;
}

export default async function CustomersPage({ searchParams }: Props) {
  const params   = await searchParams;
  const page     = Math.max(1, Number(params.page) || 1);
  const tableKey = JSON.stringify({ search: params.search, status: params.status, page });

  return (
    <CustomerDrawerShell>
      <CustomerPageHeader />

      <Suspense fallback={<CustomerStatsSkeleton />}>
        <CustomerStats />
      </Suspense>

      <Suspense fallback={<div className="h-[52px] rounded-xl bg-muted animate-pulse mb-5" />}>
        <CustomerFilters />
      </Suspense>

      <Suspense key={tableKey} fallback={<TableSkeleton rows={8} cols={6} />}>
        <CustomersTable
          search={params.search}
          status={params.status}
          page={page}
        />
      </Suspense>
    </CustomerDrawerShell>
  );
}
