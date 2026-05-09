import { Suspense } from 'react';
import { fetchCategoriesAction } from '@/actions/products';
import { fetchBusiness } from '@/services/owner';
import { TableSkeleton } from '@/components/ds/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SectionError } from '@/components/SectionError';
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

  const [catsResult, bizRes] = await Promise.all([
    fetchCategoriesAction(),
    fetchBusiness(),
  ]);
  const categories  = catsResult.ok ? catsResult.data : [];
  const businessType = bizRes?.data?.[0]?.business_type;
  const showStock    = businessType === 'shop';

  const tableKey = JSON.stringify({ search: params.search, category: params.category, status: params.status, page });

  return (
    <ProductsDrawerShell categories={categories}>
      <ProductsPageHeader />

      <ErrorBoundary fallback={<SectionError message="Failed to load filters" />}>
        <Suspense fallback={<div className="h-[72px] rounded-xl bg-muted animate-pulse mb-5" />}>
          <ProductsControls categories={categories} />
        </Suspense>
      </ErrorBoundary>

      <ErrorBoundary fallback={<SectionError message="Failed to load products" />}>
        <Suspense key={tableKey} fallback={<TableSkeleton rows={8} cols={7} />}>
          <ProductsTable
            search={params.search}
            categoryId={params.category}
            status={params.status}
            page={page}
            showStock={showStock}
          />
        </Suspense>
      </ErrorBoundary>
    </ProductsDrawerShell>
  );
}
