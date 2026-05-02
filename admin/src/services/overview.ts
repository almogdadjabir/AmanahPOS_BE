import { apiGet, ApiError } from '@/lib/api';
import type {
  ApiList,
  ApiResponse,
  Sale,
  SalesSummary,
  StockLevel,
  StaffUser,
  Customer,
} from '@/types/api';

// ── Date helpers ─────────────────────────────────────────────────────────────
export function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function dateRange(daysBack: number): { date_from: string; date_to: string } {
  const to   = new Date();
  const from = new Date();
  from.setDate(from.getDate() - daysBack);
  return { date_from: toDateStr(from), date_to: toDateStr(to) };
}

export function startOfMonth(): string {
  const d = new Date();
  d.setDate(1);
  return toDateStr(d);
}

// ── Individual fetchers (each safe — returns null on failure) ─────────────────

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) throw e; // let middleware handle
    console.error('[overview]', e instanceof Error ? e.message : e);
    return null;
  }
}

export async function fetchSalesSummary(dateFrom: string, dateTo: string) {
  return safe(() =>
    apiGet<ApiResponse<SalesSummary>>('/api/v1/sales/summary/', {
      date_from: dateFrom,
      date_to:   dateTo,
    }),
  );
}

// Fetches up to 500 completed sales for chart aggregation.
// If a business has >500 sales in a period the chart under-counts — acceptable MVP tradeoff.
export async function fetchSalesForChart(daysBack: number) {
  const { date_from, date_to } = dateRange(daysBack);
  return safe(() =>
    apiGet<ApiList<Sale>>('/api/v1/sales/', {
      date_from,
      date_to,
      status: 'completed',
      limit:  500,
      page:   1,
    }),
  );
}

export async function fetchRecentSales(limit = 8) {
  return safe(() =>
    apiGet<ApiList<Sale>>('/api/v1/sales/', {
      status: 'completed',
      limit,
      page: 1,
    }),
  );
}

export async function fetchLowStock() {
  return safe(() =>
    apiGet<ApiList<StockLevel>>('/api/v1/inventory/stock/', {
      low_stock: 'true',
      limit: 5,
      page:  1,
    }),
  );
}

export async function fetchAllStockCount() {
  return safe(() =>
    apiGet<ApiList<StockLevel>>('/api/v1/inventory/stock/', { limit: 1, page: 1 }),
  );
}

export async function fetchStaff() {
  return safe(() =>
    apiGet<ApiResponse<StaffUser[]>>('/api/v1/users/'),
  );
}

export async function fetchCustomerCount() {
  return safe(() =>
    apiGet<ApiList<Customer>>('/api/v1/customers/', { limit: 1, page: 1 }),
  );
}

// ── Aggregate all dashboard data in parallel ──────────────────────────────────
export async function fetchDashboardData() {
  const today     = toDateStr(new Date());
  const monthFrom = startOfMonth();

  const [
    summaryToday,
    summaryMonth,
    salesChart,
    recentSales,
    lowStock,
    allStock,
    staff,
    customers,
  ] = await Promise.all([
    fetchSalesSummary(today, today),
    fetchSalesSummary(monthFrom, today),
    fetchSalesForChart(30),
    fetchRecentSales(8),
    fetchLowStock(),
    fetchAllStockCount(),
    fetchStaff(),
    fetchCustomerCount(),
  ]);

  return {
    summaryToday:  summaryToday?.data   ?? null,
    summaryMonth:  summaryMonth?.data   ?? null,
    recentSales:   recentSales?.results ?? [],
    lowStockItems: lowStock?.results    ?? [],
    lowStockCount: lowStock?.count      ?? 0,
    totalProducts: allStock?.count      ?? 0,
    totalStaff:    staff?.data?.length  ?? 0,
    totalCustomers: customers?.count    ?? 0,
    chartData:     buildChartData(salesChart?.results ?? [], 30),
  };
}

// ── Chart aggregation ─────────────────────────────────────────────────────────
export interface DailyRevenue {
  date:    string;
  label:   string;
  revenue: number;
  count:   number;
}

export function buildChartData(sales: Sale[], days: number): DailyRevenue[] {
  // Build ordered map of last N days initialised to 0
  const map = new Map<string, { revenue: number; count: number }>();
  const today = new Date();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const key = toDateStr(d);
    map.set(key, { revenue: 0, count: 0 });
  }

  for (const sale of sales) {
    const key = sale.created_at.split('T')[0];
    if (map.has(key)) {
      const prev = map.get(key)!;
      map.set(key, {
        revenue: prev.revenue + parseFloat(sale.net_amount),
        count:   prev.count + 1,
      });
    }
  }

  return Array.from(map.entries()).map(([date, { revenue, count }]) => {
    const d = new Date(date + 'T00:00:00');
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    return { date, label, revenue, count };
  });
}
