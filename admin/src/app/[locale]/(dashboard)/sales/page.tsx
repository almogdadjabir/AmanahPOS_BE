import { apiGet } from '@/lib/api';
import type { ApiList, ApiResponse, Sale, SalesSummary } from '@/types/api';
import Avatar from '@/components/ui/Avatar';
import SalesBarChart from './_components/SalesBarChart';

// ── Data fetching ─────────────────────────────────────────────────────────────

function toISO(d: Date) { return d.toISOString().split('T')[0]; }
function firstOfMonth()  { const d = new Date(); d.setDate(1); return toISO(d); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return toISO(d); }

async function safe<T>(fn: () => Promise<T>, fb: T): Promise<T> {
  try { return await fn(); } catch { return fb; }
}

async function fetchSalesPage() {
  const today = toISO(new Date());
  const [todayRes, monthRes, recentRes, chartRes] = await Promise.all([
    safe(() => apiGet<ApiResponse<SalesSummary>>('/api/v1/sales/summary/', { date_from: today, date_to: today }), null),
    safe(() => apiGet<ApiResponse<SalesSummary>>('/api/v1/sales/summary/', { date_from: firstOfMonth(), date_to: today }), null),
    safe(() => apiGet<ApiList<Sale>>('/api/v1/sales/', { status: 'completed', limit: 15, page: 1 }), null),
    safe(() => apiGet<ApiList<Sale>>('/api/v1/sales/', { status: 'completed', date_from: daysAgo(6), date_to: today, limit: 500 }), null),
  ]);
  return {
    today:  todayRes?.data  ?? null,
    month:  monthRes?.data  ?? null,
    recent: recentRes?.results ?? [],
    chart:  chartRes?.results  ?? [],
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

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

export default async function SalesPage() {
  const { today, month, recent, chart } = await fetchSalesPage();

  // Bankak aggregation (from 7-day chart window)
  const bankakSales  = chart.filter(s => s.payment_method === 'bankak');
  const bankakTotal  = bankakSales.reduce((s, x) => s + parseFloat(x.net_amount), 0);
  const bankakAcct   = bankakSales.find(s => s.bankak_account_snapshot)?.bankak_account_snapshot ?? null;

  // Payment method breakdown (7-day window)
  const pmMap = new Map<string, number>();
  for (const s of chart) {
    pmMap.set(s.payment_method, (pmMap.get(s.payment_method) ?? 0) + parseFloat(s.net_amount));
  }
  const pmTotal  = [...pmMap.values()].reduce((a, b) => a + b, 0) || 1;
  const pmGroups = [...pmMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([method, amount]) => ({ method, amount, pct: (amount / pmTotal) * 100 }));

  // 7-day mini chart
  const days7 = Array.from({ length: 7 }, (_, i) => daysAgo(6 - i));
  const dayMap = new Map<string, number>(days7.map(d => [d, 0]));
  for (const s of chart) {
    const k = s.created_at.split('T')[0];
    if (dayMap.has(k)) dayMap.set(k, (dayMap.get(k) ?? 0) + parseFloat(s.net_amount));
  }
  const chartData = days7.map(d => ({
    label:   new Date(d + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short' }),
    revenue: dayMap.get(d) ?? 0,
  }));

  const todayDate = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  return (
    <div className="space-y-5">

        {/* ── Page header ───────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[22px] font-black text-text-primary tracking-tight leading-tight">Sales</h1>
            <p className="text-[13px] text-text-hint mt-0.5">{todayDate}</p>
          </div>
        </div>

        {/* ── KPI row ───────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

          {/* Today */}
          <div className="bg-white rounded-2xl border border-border-soft shadow-[0_1px_4px_0_rgb(0_0_0/.05)] p-5">
            <p className="text-[10px] font-black tracking-[.18em] uppercase text-text-hint mb-3">Today</p>
            <p className="text-[32px] font-black text-text-primary leading-none tabular-nums">
              {fmtMoney(parseFloat(today?.total_revenue ?? '0'))}
              <span className="text-[14px] font-semibold text-text-hint ml-1.5">SDG</span>
            </p>
            <p className="text-[12px] text-text-hint mt-2">
              {today?.total_sales ?? 0} {today?.total_sales === 1 ? 'sale' : 'sales'}
              {parseFloat(today?.total_discount ?? '0') > 0 && (
                <span className="text-danger/70 ml-2">
                  −{fmtMoney(parseFloat(today?.total_discount ?? '0'))} disc.
                </span>
              )}
            </p>
          </div>

          {/* This month */}
          <div className="bg-white rounded-2xl border border-border-soft shadow-[0_1px_4px_0_rgb(0_0_0/.05)] p-5">
            <p className="text-[10px] font-black tracking-[.18em] uppercase text-text-hint mb-3">This Month</p>
            <p className="text-[32px] font-black text-text-primary leading-none tabular-nums">
              {fmtMoney(parseFloat(month?.total_revenue ?? '0'))}
              <span className="text-[14px] font-semibold text-text-hint ml-1.5">SDG</span>
            </p>
            <p className="text-[12px] text-text-hint mt-2">
              {month?.total_sales ?? 0} sales ·{' '}
              avg {fmtMoney(parseFloat(month?.avg_sale_value ?? '0'))} SDG
            </p>
          </div>

          {/* Bankak balance */}
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

        {/* ── Chart + Payment breakdown ─────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          {/* 7-day bar chart */}
          <div className="lg:col-span-3 bg-white rounded-2xl border border-border-soft shadow-[0_1px_4px_0_rgb(0_0_0/.05)] p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="text-[13px] font-bold text-text-primary">7-day Revenue</p>
              <p className="text-[11px] text-text-hint">SDG</p>
            </div>
            <SalesBarChart data={chartData.map(d => ({ label: d.label, value: d.revenue }))} />
          </div>

          {/* Payment method breakdown */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-border-soft shadow-[0_1px_4px_0_rgb(0_0_0/.05)] p-5">
            <p className="text-[13px] font-bold text-text-primary mb-5">By Method</p>

            {pmGroups.length === 0 ? (
              <p className="text-[12px] text-text-hint">No data yet</p>
            ) : (
              <>
                {/* Stacked bar */}
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

        {/* ── Recent transactions ───────────────────────────────────────────── */}
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

      </div>
  );
}
