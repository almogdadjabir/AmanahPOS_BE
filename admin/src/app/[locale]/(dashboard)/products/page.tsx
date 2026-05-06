import { Suspense } from 'react';
import { fetchCategoriesAction } from '@/actions/products';
import { TableSkeleton } from '@/components/ds/Skeleton';
import ProductsDrawerShell from './_components/ProductsDrawerShell';
import ProductsPageHeader from './_components/ProductsPageHeader';
import ProductsControls from './_components/ProductsControls';
import ProductsTable from './_components/ProductsTable';

interface Props {
  searchParams: Promise<{
    search?:   string;
    category?: string;
    status?:   string;
    page?:     string;
  }>;
}

export default async function ProductsPage({ searchParams }: Props) {
  const params = await searchParams;
  const page   = Math.max(1, Number(params.page) || 1);

  const catsResult = await fetchCategoriesAction();
  const categories = catsResult.ok ? catsResult.data : [];

  const tableKey = JSON.stringify({ search: params.search, category: params.category, status: params.status, page });

  return (
    <ProductsDrawerShell categories={categories}>
      <ProductsPageHeader />

      <Suspense fallback={<div className="h-[72px] rounded-xl bg-muted animate-pulse mb-5" />}>
        <ProductsControls categories={categories} />
      </Suspense>

      <Suspense key={tableKey} fallback={<TableSkeleton rows={8} cols={7} />}>
        <ProductsTable
          search={params.search}
          categoryId={params.category}
          status={params.status}
          page={page}
        />
      </Suspense>
    </ProductsDrawerShell>
  );
}
