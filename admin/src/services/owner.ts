import { apiGet, ApiError } from '@/lib/api';
import type { ApiList, ApiResponse, Sale, SalesSummary, StockLevel, Subscription, Business } from '@/types/api';

function toISO(d: Date) { return d.toISOString().split('T')[0]; }

export function today()       { return toISO(new Date()); }
export function startOfMonth(){ const d = new Date(); d.setDate(1); return toISO(d); }
export function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return toISO(d); }

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); }
  catch (e) {
    if (e instanceof ApiError && e.status === 401) throw e;
    console.error('[owner]', e instanceof Error ? e.message : e);
    return fallback;
  }
}

export async function fetchTodaySummary() {
  const d = today();
  return safe(
    () => apiGet<ApiResponse<SalesSummary>>('/api/v1/sales/summary/', { date_from: d, date_to: d }),
    null,
  );
}

export async function fetchMonthSummary() {
  return safe(
    () => apiGet<ApiResponse<SalesSummary>>('/api/v1/sales/summary/', {
      date_from: startOfMonth(),
      date_to:   today(),
    }),
    null,
  );
}

export async function fetchRecentSales(limit = 8) {
  return safe(
    () => apiGet<ApiList<Sale>>('/api/v1/sales/', { status: 'completed', limit, page: 1 }),
    null,
  );
}

export async function fetchChartSales(days = 30) {
  return safe(
    () => apiGet<ApiList<Sale>>('/api/v1/sales/', {
      status:    'completed',
      date_from: daysAgo(days - 1),
      date_to:   today(),
      limit:     500,
      page:      1,
    }),
    null,
  );
}

export async function fetchLowStock(limit = 6) {
  return safe(
    () => apiGet<ApiList<StockLevel>>('/api/v1/inventory/stock/', { low_stock: 'true', limit, page: 1 }),
    null,
  );
}

export async function fetchSubscription() {
  return safe(
    () => apiGet<ApiResponse<Subscription | null>>('/api/v1/subscriptions/current/'),
    null,
  );
}

export async function fetchBusiness() {
  return safe(
    () => apiGet<ApiResponse<Business[]>>('/api/v1/tenants/businesses/'),
    null,
  );
}

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
export async function fetchOwnerDashboard() {
  const [todayRes, monthRes, recentRes, chartRes, lowStockRes, subRes] = await Promise.all([
    fetchTodaySummary(),
    fetchMonthSummary(),
    fetchRecentSales(8),
    fetchChartSales(30),
    fetchLowStock(6),
    fetchSubscription(),
  ]);
  return {
    todaySummary:   todayRes?.data ?? null,
    monthSummary:   monthRes?.data ?? null,
    recentSales:    recentRes?.results ?? [],
    lowStockItems:  lowStockRes?.results ?? [],
    lowStockCount:  lowStockRes?.count ?? 0,
    subscription:   subRes?.data ?? null,
    chartData:      buildChart(chartRes?.results ?? [], 30),
  };
}
