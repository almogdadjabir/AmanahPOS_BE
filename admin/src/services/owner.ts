import { cache } from 'react';
import { apiGet, ApiError } from '@/lib/api';
import { withUserCache } from '@/lib/serverCache';
import { CACHE_TAGS } from '@/lib/cacheTags';
import type { ApiList, ApiResponse, Sale, SalesSummary, StockLevel, Subscription, Business } from '@/types/api';

function toISO(d: Date) { return d.toISOString().split('T')[0]; }

export function today()        { return toISO(new Date()); }
export function startOfMonth() { const d = new Date(); d.setDate(1); return toISO(d); }
export function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return toISO(d); }

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); }
  catch (e) {
    // Check ApiError BEFORE 'digest' check — Next.js adds digest to all thrown
    // errors, so checking digest first would re-throw 429 ApiErrors.
    if (e instanceof ApiError) {
      if (e.status === 401) throw e;
      console.error('[owner]', e.status, e.message);
      return fallback;
    }
    if (typeof e === 'object' && e !== null && 'digest' in e) throw e;
    console.error('[owner]', e instanceof Error ? e.message : e);
    return fallback;
  }
}

export async function fetchTodaySummary(shopId?: string) {
  const d = today();
  const params: Record<string, string | number> = { date_from: d, date_to: d };
  if (shopId) params.shop = shopId;
  return safe(
    () => withUserCache(
      (tok) => apiGet<ApiResponse<SalesSummary>>('/api/v1/sales/summary/', params, { token: tok }),
      [CACHE_TAGS.sales, 'today', shopId ?? ''],
      30,
    ),
    null,
  );
}

export async function fetchMonthSummary(shopId?: string) {
  const from = startOfMonth();
  const to   = today();
  const params: Record<string, string | number> = { date_from: from, date_to: to };
  if (shopId) params.shop = shopId;
  return safe(
    () => withUserCache(
      (tok) => apiGet<ApiResponse<SalesSummary>>('/api/v1/sales/summary/', params, { token: tok }),
      [CACHE_TAGS.sales, 'month', from, shopId ?? ''],
      60,
    ),
    null,
  );
}

export async function fetchChartSales(days = 30, shopId?: string) {
  const from = daysAgo(days - 1);
  const to   = today();
  const params: Record<string, string | number> = {
    status: 'completed', date_from: from, date_to: to, limit: 500, page: 1,
  };
  if (shopId) params.shop = shopId;
  return safe(
    () => withUserCache(
      (tok) => apiGet<ApiList<Sale>>('/api/v1/sales/', params, { token: tok }),
      [CACHE_TAGS.sales, 'chart', String(days), from, shopId ?? ''],
      30,
    ),
    null,
  );
}

export async function fetchLowStock(limit = 6, shopId?: string) {
  const params: Record<string, string | number> = { low_stock: 'true', limit, page: 1 };
  if (shopId) params.shop = shopId;
  return safe(
    () => withUserCache(
      (tok) => apiGet<ApiList<StockLevel>>('/api/v1/inventory/stock/', params, { token: tok }),
      [CACHE_TAGS.inventory, 'low', String(limit), shopId ?? ''],
      60,
    ),
    null,
  );
}

export async function fetchSubscription() {
  return safe(
    () => withUserCache(
      (tok) => apiGet<ApiResponse<Subscription | null>>('/api/v1/subscriptions/current/', undefined, { token: tok }),
      [CACHE_TAGS.subscription],
      300,
    ),
    null,
  );
}

export const fetchBusiness = cache(async function fetchBusiness() {
  return safe(
    () => withUserCache(
      (tok) => apiGet<ApiResponse<Business[]>>('/api/v1/tenants/businesses/', undefined, { token: tok }),
      [CACHE_TAGS.businesses],
      120,
    ),
    null,
  );
});

// ── Chart aggregation ─────────────────────────────────────────────────────────
export interface DailyPoint { date: string; label: string; revenue: number; count: number }

export function buildChart(sales: Sale[], days: number): DailyPoint[] {
  const map = new Map<string, { revenue: number; count: number }>();
  const base = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(base); d.setDate(base.getDate() - i);
    map.set(toISO(d), { revenue: 0, count: 0 });
  }
  for (const s of sales) {
    const k = s.created_at.split('T')[0];
    if (map.has(k)) {
      const p = map.get(k)!;
      map.set(k, { revenue: p.revenue + parseFloat(s.net_amount), count: p.count + 1 });
    }
  }
  return Array.from(map.entries()).map(([date, v]) => ({
    date,
    label: new Date(date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    ...v,
  }));
}

// ── Aggregate all owner dashboard data ───────────────────────────────────────
export async function fetchOwnerDashboard(shopId?: string) {
  const [todayRes, monthRes, chartRes, lowStockRes, subRes] = await Promise.all([
    fetchTodaySummary(shopId),
    fetchMonthSummary(shopId),
    fetchChartSales(30, shopId),
    fetchLowStock(6, shopId),
    fetchSubscription(),
  ]);

  const allSales = chartRes?.results ?? [];
  const recentSales = [...allSales]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 8);

  return {
    todaySummary:  todayRes?.data ?? null,
    monthSummary:  monthRes?.data ?? null,
    recentSales,
    lowStockItems: lowStockRes?.results ?? [],
    lowStockCount: lowStockRes?.count ?? 0,
    subscription:  subRes?.data ?? null,
    chartData:     buildChart(allSales, 30),
  };
}
