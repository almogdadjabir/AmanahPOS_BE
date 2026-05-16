import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { TableSkeleton } from '@/components/ds/Skeleton';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SectionError } from '@/components/SectionError';
import type { PremiumInventorySummary, Shop } from '@/types/api';
import InventoryDrawerShell from './_components/InventoryDrawerShell';
import InventoryPageHeader from './_components/InventoryPageHeader';
import InventoryStats, { InventoryStatsSkeleton } from './_components/InventoryStats';
import InventoryFilters from './_components/InventoryFilters';
import InventoryTable from './_components/InventoryTable';
import PremiumLockedInventoryCard from './_components/PremiumLockedInventoryCard';
import PremiumInventoryShell from './_components/PremiumInventoryShell';
import { fetchBusiness, fetchUserProfile } from '@/services/owner';
import {
  fetchPremiumSummaryAction,
  fetchStockLevelsAction,
  fetchExpiryReportAction,
  fetchVendorSummaryAction,
  fetchInboundListAction,
} from '@/actions/inventory';
import type { RestockItem, ExpiryBatchLite, VendorLite, ReceiptLite } from './_components/tiles';

interface SearchParams {
  search?: string;
  status?: string;
  page?:   string;
}

interface Props {
  searchParams: Promise<SearchParams>;
}

// ── Premium tile data ─────────────────────────────────────────────────

type PremiumInventoryData = {
  health:   { pct: number; inStock: number; low: number; out: number };
  velocity: { series: number[]; labels: string[]; avgPerDay: number; peak: { value: number; label: string }; spend: string; deltaPct: number };
  restock:  RestockItem[];
  expiry:   { batches: ExpiryBatchLite[]; nearestDangerCount: number; suggestion?: string };
  vendors:  VendorLite[];
  receipts: ReceiptLite[];
};

async function loadPremiumInventoryData(
  shops: Shop[],
  summary: PremiumInventorySummary | null,
): Promise<PremiumInventoryData> {
  const [restockRes, expiryRes, vendorRes, receiptsRes] = await Promise.all([
    fetchStockLevelsAction({ status: 'low_stock', limit: 10 }),
    fetchExpiryReportAction({ status: 'expiring_soon', page: 1 }),
    fetchVendorSummaryAction(),
    fetchInboundListAction({ page: 1 }),
  ]);

  // ── Health ─────────────────────────────────────────────────────────
  const totalItems = summary?.stock_items_count ?? 0;
  const low  = summary?.low_stock_count ?? 0;
  const out  = summary?.out_of_stock_count ?? 0;
  const inStock = Math.max(0, totalItems - low - out);
  const pct  = totalItems > 0 ? (inStock / totalItems) * 100 : 100;

  // ── Velocity (14-day bar chart from inbound transactions) ──────────
  const transactions = receiptsRes.ok ? receiptsRes.data : [];
  const DAY_ABBRS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  const today  = new Date();
  const series: number[] = Array(14).fill(0);
  const labels: string[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    labels.push(DAY_ABBRS[d.getDay()]);
  }
  for (const txn of transactions) {
    const daysAgo = Math.floor(
      (today.getTime() - new Date(txn.created_at).getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysAgo >= 0 && daysAgo < 14) {
      series[13 - daysAgo] += Number(txn.total_quantity ?? 0);
    }
  }
  const total14   = series.reduce((a, b) => a + b, 0);
  const avgPerDay = Math.round(total14 / 14);
  const peakVal   = Math.max(...series, 0);
  const peakIdx   = series.indexOf(peakVal);
  const last7     = series.slice(7).reduce((a, b) => a + b, 0);
  const prior7    = series.slice(0, 7).reduce((a, b) => a + b, 0);
  const deltaPct  = prior7 === 0 ? 0 : Math.round(((last7 - prior7) / prior7) * 100);

  // ── Restock queue ──────────────────────────────────────────────────
  const restock: RestockItem[] = (restockRes.ok ? restockRes.data : [])
    .slice(0, 8)
    .map(s => ({
      id:     s.id,
      name:   s.product_name,
      qty:    Math.max(0, Math.round(Number(s.quantity))),
      min:    0,
      vendor: '—',
    }));

  // ── Expiry ─────────────────────────────────────────────────────────
  const expiryBatches: ExpiryBatchLite[] = (expiryRes.ok ? expiryRes.data : [])
    .slice(0, 8)
    .map(b => ({
      id:   b.id,
      name: b.product_name,
      days: b.days_remaining,
      qty:  Math.round(Number(b.quantity)),
    }));
  const nearestDangerCount = expiryBatches.filter(b => b.days < 7).length;
  const suggestion = nearestDangerCount > 0
    ? `${nearestDangerCount} ${nearestDangerCount === 1 ? 'batch' : 'batches'} expire within 5 days. Suggested: run a markdown.`
    : undefined;

  // ── Vendors ────────────────────────────────────────────────────────
  const vendorData = vendorRes.ok ? vendorRes.data : null;
  const totalTxn   = vendorData?.total_transactions ?? 1;
  const vendors: VendorLite[] = (vendorData?.vendors ?? [])
    .slice(0, 5)
    .map(v => ({
      id:     v.vendor_id,
      name:   v.vendor_name,
      share:  Math.round((v.transactions_count / Math.max(1, totalTxn)) * 100),
      value:  v.total_quantity,
      onTime: 100,
    }));

  // ── Recent receipts ────────────────────────────────────────────────
  const receipts: ReceiptLite[] = transactions.slice(0, 5).map(t => ({
    id:     t.reference,
    vendor: t.vendor?.name ?? '—',
    units:  Math.round(Number(t.total_quantity ?? 0)),
    value:  t.total_quantity ?? '0',
    shop:   t.shop_name,
    time:   new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  }));

  return {
    health:   { pct, inStock, low, out },
    velocity: {
      series, labels, avgPerDay,
      peak:     { value: peakVal, label: labels[peakIdx] ?? '—' },
      spend:    '—',
      deltaPct,
    },
    restock,
    expiry:   { batches: expiryBatches, nearestDangerCount, suggestion },
    vendors,
    receipts,
  };
}

// ── Non-premium experience (identical to previous behavior) ───────────

async function BasicInventoryView({
  shops,
  params,
}: {
  shops:  Shop[];
  params: SearchParams;
}) {
  const page     = Math.max(1, Number(params.page) || 1);
  const tableKey = JSON.stringify({ search: params.search, status: params.status, page });

  return (
    <InventoryDrawerShell>
      <InventoryPageHeader />
      <PremiumLockedInventoryCard />

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
          <InventoryTable search={params.search} status={params.status} page={page} />
        </Suspense>
      </ErrorBoundary>
    </InventoryDrawerShell>
  );
}

// ── Page ──────────────────────────────────────────────────────────────

export default async function InventoryPage({ searchParams }: Props) {
  const [bizRes, profileRes] = await Promise.all([fetchBusiness(), fetchUserProfile()]);
  if (bizRes?.data?.[0]?.business_type !== 'shop') notFound();

  const shops     = bizRes?.data?.[0]?.shops ?? [];
  const isPremium = Boolean(profileRes?.data?.enabled_features?.inventory_inbound_receiving);
  const params    = await searchParams;

  if (!isPremium) {
    return <BasicInventoryView shops={shops} params={params} />;
  }

  const summaryRes = await fetchPremiumSummaryAction();
  const summary    = summaryRes?.ok ? summaryRes.data : null;
  const data       = await loadPremiumInventoryData(shops, summary);

  return (
    <InventoryDrawerShell>
      <PremiumInventoryShell shops={shops} summary={summary} data={data} />
    </InventoryDrawerShell>
  );
}
