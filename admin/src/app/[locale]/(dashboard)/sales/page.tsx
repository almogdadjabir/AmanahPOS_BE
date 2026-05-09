import { Suspense, cache } from 'react';
import { apiGet } from '@/lib/api';
import { withUserCache } from '@/lib/serverCache';
import { CACHE_TAGS } from '@/lib/cacheTags';
import { fetchBusiness } from '@/services/owner';
import { ShopSwitcherBar } from '@/components/ShopSwitcherBar';

export const dynamic = 'force-dynamic';
import type { ApiList, ApiResponse, Sale, SalesSummary, SalesShopBreakdown } from '@/types/api';
import Avatar from '@/components/ui/Avatar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SectionError } from '@/components/SectionError';
import { TableSkeleton, ChartSkeleton } from '@/components/ds/Skeleton';
import SalesBarChart from './_components/SalesBarChart';

// ── Date helpers ──────────────────────────────────────────────────────────────

function toISO(d: Date) { return d.toISOString().split('T')[0]; }
function firstOfMonth()  { const d = new Date(); d.setDate(1); return toISO(d); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return toISO(d); }

// ── Cached fetchers ───────────────────────────────────────────────────────────
// Two-layer caching:
//   • React.cache()   — deduplicates concurrent calls within the SAME render
//     (SalesChartSection + SalesByShopSection get cache hits, no extra HTTP requests)
//   • withUserCache() — persists results across navigations (30–60s TTL per user+shop)
//     so rapid shop-switching hits the Next.js Data Cache instead of the API,
//     preventing 429 rate-limit bursts.

const _weekSales = cache(async (dateFrom: string, dateTo: string, shopId: string | undefined) =>
  withUserCache(
    (tok) => apiGet<ApiList<Sale>>('/api/v1/sales/', {
      status: 'completed', date_from: dateFrom, date_to: dateTo, limit: 500, shop: shopId,
    }, { token: tok }),
    [CACHE_TAGS.sales, 'sp-week', dateFrom, dateTo, shopId ?? ''],
    15,
  )
);

const _monthSummary = cache(async (dateFrom: string, dateTo: string, shopId: string | undefined) =>
  withUserCache(
    (tok) => apiGet<ApiResponse<SalesSummary & { shops_breakdown?: SalesShopBreakdown[] }>>(
      '/api/v1/sales/summary/',
      { date_from: dateFrom, date_to: dateTo, breakdown: 'shops', shop: shopId },
      { token: tok },
    ),
    [CACHE_TAGS.salesSummary, 'sp-month', dateFrom, dateTo, shopId ?? ''],
    15,
  )
);

const _todaySummary = cache(async (today: string, shopId: string | undefined) =>
  withUserCache(
    (tok) => apiGet<ApiResponse<SalesSummary>>('/api/v1/sales/summary/', {
      date_from: today, date_to: today, shop: shopId,
    }, { token: tok }),
    [CACHE_TAGS.salesSummary, 'sp-today', today, shopId ?? ''],
    15,
  )
);

const _recentSales = cache(async (shopId: string | undefined) =>
  withUserCache(
    (tok) => apiGet<ApiList<Sale>>('/api/v1/sales/', {
      status: 'completed', limit: 15, page: 1, shop: shopId,
    }, { token: tok }),
    [CACHE_TAGS.sales, 'sp-recent', shopId ?? ''],
    15,
  )
);

// ── Display helpers ───────────────────────────────────────────────────────────

function fmtMoney(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', bankak: 'Bankak', card: 'Card',
  bank_transfer: 'Bank', mobile_wallet: 'Mobile', loyalty_points: 'Points',
  split: 'Split', credit: 'Credit',
};
const METHOD_COLOR: Record<string, string> = {
  cash:           'bg-info/80',
  bankak:         'bg-success/80',
  card:           'bg-primary/80',
  bank_transfer:  'bg-warning/80',
  mobile_wallet:  'bg-purple-500/80',
  loyalty_points: 'bg-orange-400/80',
  split:          'bg-slate-400/80',
  credit:         'bg-rose-400/80',
};
const METHOD_TEXT: Record<string, string> = {
  cash:           'text-info',
  bankak:         'text-success',
  card:           'text-primary',
  bank_transfer:  'text-warning',
  mobile_wallet:  'text-purple-600',
  loyalty_points: 'text-orange-500',
  split:          'text-slate-500',
  credit:         'text-rose-500',
};
const STATUS_STYLE: Record<string, string> = {
  completed:      'bg-success/10 text-success',
  pending:        'bg-warning/10 text-warning',
  cancelled:      'bg-danger/10 text-danger',
  refunded:       'bg-info/10 text-info',
  partial_refund: 'bg-orange-100 text-orange-600',
};

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ shop_id?: string }>;
}) {
  const params       = await searchParams;
  const selectedShop = params.shop_id;

  const bizRes = await fetchBusiness();
  const shops  = bizRes?.data?.[0]?.shops ?? [];

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-5">

      {/* ── Page header ───────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div>
            <h1 className="text-[22px] font-black text-text-primary tracking-tight leading-tight">Sales</h1>
            <p className="text-[13px] text-text-hint mt-0.5">{todayDate}</p>
          </div>
        </div>
        <Suspense fallback={null}>
          <ShopSwitcherBar shops={shops} />
        </Suspense>
      </div>

      {/* ── KPI row ───────────────────────────────────────────────────────── */}
      <ErrorBoundary fallback={<SectionError message="Failed to load sales summary" />}>
        <Suspense fallback={<SalesKpiSkeleton />}>
          <SalesSummarySection shopId={selectedShop} />
        </Suspense>
      </ErrorBoundary>

      {/* ── 7-day bar chart + payment breakdown ───────────────────────────── */}
      <ErrorBoundary fallback={<SectionError message="Failed to load chart data" />}>
        <Suspense fallback={<ChartSkeleton />}>
          <SalesChartSection shopId={selectedShop} />
        </Suspense>
      </ErrorBoundary>

      {/* ── Per-shop revenue breakdown ────────────────────────────────────── */}
      <ErrorBoundary fallback={<SectionError message="Failed to load shop breakdown" />}>
        <Suspense fallback={<ShopBreakdownSkeleton />}>
          <SalesByShopSection shopId={selectedShop} />
        </Suspense>
      </ErrorBoundary>

      {/* ── Recent transactions ───────────────────────────────────────────── */}
      <ErrorBoundary fallback={<SectionError message="Failed to load recent transactions" />}>
        <Suspense fallback={<TableSkeleton rows={8} cols={7} />}>
          <SalesRecentSection shopId={selectedShop} />
        </Suspense>
      </ErrorBoundary>

    </div>
  );
}

// ── Section: KPI cards (today + month + bankak) ───────────────────────────────

async function SalesSummarySection({ shopId }: { shopId?: string }) {
  const today   = toISO(new Date());
  const weekAgo = daysAgo(6);
  const month   = firstOfMonth();

  const [todayRes, monthRes, chartRes] = await Promise.all([
    _todaySummary(today, shopId),
    _monthSummary(month, today, shopId),
    _weekSales(weekAgo, today, shopId),
  ]);

  const todayData  = todayRes?.data ?? null;
  const monthData  = monthRes?.data ?? null;
  const chart      = chartRes?.results ?? [];

  const bankakSales = chart.filter(s => s.payment_method === 'bankak');
  const bankakTotal = bankakSales.reduce((s, x) => s + parseFloat(x.net_amount), 0);
  const bankakAcct  = bankakSales.find(s => s.bankak_account_snapshot)?.bankak_account_snapshot ?? null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

      {/* Today */}
      <div className="bg-white rounded-2xl border border-border-soft shadow-[0_1px_4px_0_rgb(0_0_0/.05)] p-5">
        <p className="text-[10px] font-black tracking-[.18em] uppercase text-text-hint mb-3">Today</p>
        <p className="text-[32px] font-black text-text-primary leading-none tabular-nums">
          {fmtMoney(parseFloat(todayData?.total_revenue ?? '0'))}
          <span className="text-[14px] font-semibold text-text-hint ml-1.5">SDG</span>
        </p>
        <p className="text-[12px] text-text-hint mt-2">
          {todayData?.total_sales ?? 0} {todayData?.total_sales === 1 ? 'sale' : 'sales'}
          {parseFloat(todayData?.total_discount ?? '0') > 0 && (
            <span className="text-danger/70 ml-2">
              −{fmtMoney(parseFloat(todayData?.total_discount ?? '0'))} disc.
            </span>
          )}
        </p>
      </div>

      {/* This month */}
      <div className="bg-white rounded-2xl border border-border-soft shadow-[0_1px_4px_0_rgb(0_0_0/.05)] p-5">
        <p className="text-[10px] font-black tracking-[.18em] uppercase text-text-hint mb-3">This Month</p>
        <p className="text-[32px] font-black text-text-primary leading-none tabular-nums">
          {fmtMoney(parseFloat(monthData?.total_revenue ?? '0'))}
          <span className="text-[14px] font-semibold text-text-hint ml-1.5">SDG</span>
        </p>
        <p className="text-[12px] text-text-hint mt-2">
          {monthData?.total_sales ?? 0} sales ·{' '}
          avg {fmtMoney(parseFloat(monthData?.avg_sale_value ?? '0'))} SDG
        </p>
      </div>

      {/* Bankak */}
      <div className="relative overflow-hidden bg-white rounded-2xl border border-success/20 shadow-[0_1px_4px_0_rgb(0_0_0/.05)] p-5">
        <div className="absolute top-0 right-0 w-20 h-20 rounded-full bg-success/5 -translate-y-6 translate-x-6 pointer-events-none" />
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-black tracking-[.18em] uppercase text-success">Bankak Balance</p>
          <span className="text-[9px] font-bold tracking-wide text-success/70 bg-success/8 border border-success/15 px-2 py-0.5 rounded-full">
            This week
          </span>
        </div>
        <p className="text-[32px] font-black text-text-primary leading-none tabular-nums">
          {fmtMoney(bankakTotal)}
          <span className="text-[14px] font-semibold text-text-hint ml-1.5">SDG</span>
        </p>
        <p className="text-[12px] text-text-hint mt-2">
          {bankakSales.length} Bankak {bankakSales.length === 1 ? 'payment' : 'payments'}
          {bankakAcct && (
            <span className="font-mono text-success/80 ml-1.5">· {bankakAcct}</span>
          )}
        </p>
      </div>
    </div>
  );
}

// ── Section: 7-day bar chart + payment breakdown ──────────────────────────────

async function SalesChartSection({ shopId }: { shopId?: string }) {
  const today   = toISO(new Date());
  const weekAgo = daysAgo(6);
  // Cache hit — SalesSummarySection already seeded this; no new HTTP request.
  const chartRes = await _weekSales(weekAgo, today, shopId);
  const chart = chartRes?.results ?? [];

  const pmMap = new Map<string, number>();
  for (const s of chart) {
    pmMap.set(s.payment_method, (pmMap.get(s.payment_method) ?? 0) + parseFloat(s.net_amount));
  }
  const pmTotal  = [...pmMap.values()].reduce((a, b) => a + b, 0) || 1;
  const pmGroups = [...pmMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([method, amount]) => ({ method, amount, pct: (amount / pmTotal) * 100 }));

  const days7  = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i));
  const dayMap = new Map<string, number>(days7.map(d => [d, 0]));
  for (const s of chart) {
    const k = s.created_at.split('T')[0];
    if (dayMap.has(k)) dayMap.set(k, (dayMap.get(k) ?? 0) + parseFloat(s.net_amount));
  }
  const chartData = days7.map(d => ({
    label: new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
    value: dayMap.get(d) ?? 0,
  }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

      <div className="lg:col-span-3 bg-white rounded-2xl border border-border-soft shadow-[0_1px_4px_0_rgb(0_0_0/.05)] p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-bold text-text-primary">7-day Revenue</p>
          <p className="text-[11px] text-text-hint">SDG</p>
        </div>
        <SalesBarChart data={chartData} />
      </div>

      <div className="lg:col-span-2 bg-white rounded-2xl border border-border-soft shadow-[0_1px_4px_0_rgb(0_0_0/.05)] p-5">
        <p className="text-[13px] font-bold text-text-primary mb-5">By Method</p>

        {pmGroups.length === 0 ? (
          <p className="text-[12px] text-text-hint">No data yet</p>
        ) : (
          <>
            <div className="flex h-2 rounded-full overflow-hidden mb-5 gap-px">
              {pmGroups.map(g => (
                <div
                  key={g.method}
                  className={`${METHOD_COLOR[g.method] ?? 'bg-slate-300'} transition-all`}
                  style={{ width: `${g.pct}%` }}
                />
              ))}
            </div>
            <div className="space-y-2.5">
              {pmGroups.map(g => (
                <div key={g.method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${METHOD_COLOR[g.method] ?? 'bg-slate-300'}`} />
                    <span className="text-[12px] text-text-secondary font-medium">
                      {METHOD_LABEL[g.method] ?? g.method}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-text-hint">{g.pct.toFixed(0)}%</span>
                    <span className={`text-[12px] font-bold tabular-nums ${METHOD_TEXT[g.method] ?? 'text-text-primary'}`}>
                      {fmtMoney(g.amount)} <span className="font-normal text-text-hint text-[10px]">SDG</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Section: recent transactions ──────────────────────────────────────────────

async function SalesRecentSection({ shopId }: { shopId?: string }) {
  const recentRes = await _recentSales(shopId);
  const recent = recentRes?.results ?? [];

  return (
    <div className="bg-white rounded-2xl border border-border-soft shadow-[0_1px_4px_0_rgb(0_0_0/.05)] overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft">
        <p className="text-[13px] font-bold text-text-primary">Recent Transactions</p>
        <span className="text-[11px] text-text-hint">{recent.length} shown</span>
      </div>

      {recent.length === 0 ? (
        <div className="px-5 py-12 text-center">
          <p className="text-[13px] text-text-hint">No transactions yet</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-soft">
                {['Receipt', 'Cashier', 'Method', 'Status', 'Items', 'Amount', 'Date'].map(h => (
                  <th key={h} className="text-start px-4 py-2.5 text-[10px] font-black tracking-[.14em] uppercase text-text-hint last:text-end whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.map(sale => {
                const date = new Date(sale.created_at).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric',
                });
                return (
                  <tr key={sale.id} className="border-b border-border-soft/60 hover:bg-surface-soft transition-colors last:border-0">
                    <td className="px-4 py-3 font-mono text-[11px] text-text-hint whitespace-nowrap">
                      {sale.receipt_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={sale.cashier_name} size={22} />
                        <span className="text-[12px] text-text-primary whitespace-nowrap">{sale.cashier_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${METHOD_TEXT[sale.payment_method] ?? 'text-text-secondary'}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${METHOD_COLOR[sale.payment_method] ?? 'bg-slate-300'}`} />
                        {METHOD_LABEL[sale.payment_method] ?? sale.payment_method}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[sale.status] ?? 'bg-surface-muted text-text-hint'}`}>
                        {sale.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-text-secondary">{sale.item_count}</td>
                    <td className="px-4 py-3">
                      <span className="text-[13px] font-bold text-text-primary tabular-nums">
                        {fmtMoney(parseFloat(sale.net_amount))}
                        <span className="text-[10px] font-normal text-text-hint ml-1">SDG</span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-text-hint text-end whitespace-nowrap">{date}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Section: per-shop revenue breakdown ──────────────────────────────────────
// Hides automatically when a single shop is selected (breakdown.length <= 1).

async function SalesByShopSection({ shopId }: { shopId?: string }) {
  const today = toISO(new Date());
  // Cache hit — SalesSummarySection already seeded this; no new HTTP request.
  const res = await _monthSummary(firstOfMonth(), today, shopId);
  const breakdown = res?.data?.shops_breakdown ?? [];

  if (breakdown.length <= 1) return null;

  const maxTotal = Math.max(...breakdown.map(r => parseFloat(r.total) || 0)) || 1;

  return (
    <div className="bg-white rounded-2xl border border-border-soft shadow-[0_1px_4px_0_rgb(0_0_0/.05)] p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[13px] font-bold text-text-primary">Revenue by Shop</p>
          <p className="text-[11px] text-text-hint mt-0.5">This month · SDG</p>
        </div>
        <span className="text-[10px] font-bold text-text-hint bg-surface-soft border border-border-soft px-2.5 py-1 rounded-full">
          {breakdown.length} shops
        </span>
      </div>

      <div className="space-y-3">
        {breakdown.map((row, i) => {
          const amount = parseFloat(row.total) || 0;
          const pct    = (amount / maxTotal) * 100;
          const colors = ['bg-primary', 'bg-info', 'bg-success', 'bg-warning', 'bg-purple-500', 'bg-rose-400'];
          const color  = colors[i % colors.length];

          return (
            <div key={row.shop_id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${color}`} />
                  <span className="text-[12px] font-semibold text-text-primary truncate">
                    {row.shop_name}
                  </span>
                  <span className="text-[11px] text-text-hint shrink-0">
                    {row.count} {row.count === 1 ? 'sale' : 'sales'}
                  </span>
                </div>
                <span className="text-[13px] font-bold tabular-nums text-text-primary ml-3 shrink-0">
                  {fmtMoney(amount)}
                  <span className="text-[10px] font-normal text-text-hint ml-1">SDG</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-surface-soft overflow-hidden">
                <div
                  className={`h-full rounded-full ${color} opacity-70 transition-all`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Skeletons ─────────────────────────────────────────────────────────────────

function ShopBreakdownSkeleton() {
  return (
    <div className="bg-white rounded-2xl border border-border-soft p-5 space-y-4 animate-pulse">
      <div className="flex justify-between">
        <div className="space-y-1.5">
          <div className="h-3 w-32 rounded bg-muted" />
          <div className="h-2.5 w-20 rounded bg-muted" />
        </div>
        <div className="h-6 w-16 rounded-full bg-muted" />
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="space-y-1.5">
          <div className="flex justify-between">
            <div className="h-2.5 w-24 rounded bg-muted" />
            <div className="h-2.5 w-16 rounded bg-muted" />
          </div>
          <div className="h-1.5 w-full rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function SalesKpiSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-border-soft p-5 space-y-3 animate-pulse">
          <div className="h-2.5 w-16 rounded bg-muted" />
          <div className="h-8 w-28 rounded bg-muted" />
          <div className="h-2.5 w-24 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
