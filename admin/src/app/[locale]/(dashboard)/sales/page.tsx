import { Suspense, cache } from 'react';
import { getLocale, getTranslations } from 'next-intl/server';
import { apiGet } from '@/lib/api';
import { withUserCache } from '@/lib/serverCache';
import { CACHE_TAGS } from '@/lib/cacheTags';
import { fetchBusiness } from '@/services/owner';
import { ShopSwitcherBar } from '@/components/ShopSwitcherBar';
import SalesTableClient from './_components/SalesTableClient';
import { Clock, Calendar, CreditCard, RotateCcw, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';

export const dynamic = 'force-dynamic';
import type { ApiList, ApiResponse, Sale, SalesSummary, SalesShopBreakdown } from '@/types/api';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { SectionError } from '@/components/SectionError';
import { TableSkeleton, ChartSkeleton } from '@/components/ds/Skeleton';
import SalesBarChart from './_components/SalesBarChart';
import Pagination from '@/components/ds/Pagination';

// ── Date helpers ──────────────────────────────────────────────────────────────

function toISO(d: Date) { return d.toISOString().split('T')[0]; }
function firstOfMonth()  { const d = new Date(); d.setDate(1); return toISO(d); }
function daysAgo(n: number) { const d = new Date(); d.setDate(d.getDate() - n); return toISO(d); }

// ── S4: Full grouped tabular figures — no K/M abbreviation (chart Y-axis only may abbreviate)
function fmtMoney(v: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(v));
}

// ── S1: Method colors — no blue, slate for cash/card/neutral, teal for bankak ─
// BAR class used for the stacked segment and legend dot
const METHOD_BAR_CLASS: Record<string, string> = {
  cash:           'bg-[#94A1B2]',           // slate-dot
  bankak:         'bg-primary',              // teal
  card:           'bg-muted-foreground/50',
  bank_transfer:  'bg-warning/70',
  mobile_wallet:  'bg-muted-foreground/40',
  loyalty_points: 'bg-warning/60',
  split:          'bg-muted-foreground/30',
  credit:         'bg-danger/70',
};
// TEXT class for the legend amount
const METHOD_TEXT: Record<string, string> = {
  cash:           'text-[#536074]',
  bankak:         'text-primary',
  card:           'text-muted-foreground',
  bank_transfer:  'text-warning',
  mobile_wallet:  'text-muted-foreground',
  loyalty_points: 'text-warning',
  split:          'text-muted-foreground',
  credit:         'text-danger',
};
const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', bankak: 'Bankak', card: 'Card',
  bank_transfer: 'Bank', mobile_wallet: 'Mobile',
  loyalty_points: 'Points', split: 'Split', credit: 'Credit',
};

// ── Cached fetchers ───────────────────────────────────────────────────────────

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

const PAGE_SIZE = 25;

const _recentSales = cache(async (shopId: string | undefined, page: number) =>
  withUserCache(
    (tok) => apiGet<ApiList<Sale>>('/api/v1/sales/', {
      limit: PAGE_SIZE, page, shop: shopId,
    }, { token: tok }),
    [CACHE_TAGS.sales, 'sp-recent', shopId ?? '', String(page)],
    15,
  )
);

// ── S3: Shared KPI card structure — icon chip, neutral label, uniform padding ─

function KpiCard({
  label, value, footer, icon, chipClass,
}: {
  label: string;
  value: number;
  footer: React.ReactNode;
  icon: React.ReactNode;
  chipClass?: string;
}) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-xs p-4 hover:shadow-card hover:-translate-y-px transition-[box-shadow,transform] duration-200 cursor-default">
      <div className="flex items-center justify-between mb-3">
        {/* S2: all labels = identical neutral-gray uppercase — no color in label */}
        <p className="text-[11px] font-semibold uppercase tracking-[.04em] text-muted-foreground select-none">
          {label}
        </p>
        {/* S3: icon chip top-right — teal-tint by default, neutral for zero/empty states */}
        <span className={cn(
          "w-[30px] h-[30px] rounded-lg flex items-center justify-center [&_svg]:size-[15px] shrink-0",
          chipClass ?? "bg-primary-tint [&_svg]:text-primary",
        )}>
          {icon}
        </span>
      </div>
      {/* S4: full grouped tabular figures, not K */}
      <p className="text-[28px] font-semibold text-foreground leading-none tabular-nums num">
        {fmtMoney(value)}
        <span className="text-[12.5px] font-medium text-muted-foreground ms-1.5">SDG</span>
      </p>
      <div className="text-[12px] text-muted-foreground mt-2">{footer}</div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ shop_id?: string; page?: string }>;
}) {
  const [t, params, locale] = await Promise.all([
    getTranslations('sales'),
    searchParams,
    getLocale(),
  ]);
  const selectedShop = params.shop_id;
  const currentPage  = Math.max(1, Number(params.page) || 1);

  const bizRes = await fetchBusiness();
  const shops  = bizRes?.data?.[0]?.shops ?? [];

  const todayDate = new Date().toLocaleDateString(locale === 'ar' ? 'ar-SA' : 'en-US', {
    weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="space-y-4">

      {/* S7: simple title header — same pattern as other pages */}
      <div>
        <div className="flex items-start justify-between gap-4 flex-wrap mb-3">
          <div>
            <h1 className="text-[21px] font-semibold text-foreground tracking-[-.025em] leading-tight">
              {t('title')}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1">{todayDate}</p>
          </div>
        </div>
        <Suspense fallback={null}>
          <ShopSwitcherBar shops={shops} />
        </Suspense>
      </div>

      {/* KPI row */}
      <ErrorBoundary fallback={<SectionError message="Failed to load sales summary" />}>
        <Suspense fallback={<SalesKpiSkeleton />}>
          <SalesSummarySection shopId={selectedShop} />
        </Suspense>
      </ErrorBoundary>

      {/* 7-day bar chart + payment breakdown */}
      <ErrorBoundary fallback={<SectionError message="Failed to load chart data" />}>
        <Suspense fallback={<ChartSkeleton />}>
          <SalesChartSection shopId={selectedShop} />
        </Suspense>
      </ErrorBoundary>

      {/* Per-shop revenue breakdown */}
      <ErrorBoundary fallback={<SectionError message="Failed to load shop breakdown" />}>
        <Suspense fallback={<ShopBreakdownSkeleton />}>
          <SalesByShopSection shopId={selectedShop} />
        </Suspense>
      </ErrorBoundary>

      {/* Recent transactions */}
      <ErrorBoundary fallback={<SectionError message="Failed to load recent transactions" />}>
        <Suspense fallback={<TableSkeleton rows={8} cols={7} />}>
          <SalesRecentSection shopId={selectedShop} page={currentPage} />
        </Suspense>
      </ErrorBoundary>

    </div>
  );
}

// ── Section: KPI cards ────────────────────────────────────────────────────────

async function SalesSummarySection({ shopId }: { shopId?: string }) {
  const t = await getTranslations('sales');
  const today   = toISO(new Date());
  const weekAgo = daysAgo(6);
  const month   = firstOfMonth();

  const [todayRes, monthRes, chartRes, bizRes] = await Promise.all([
    _todaySummary(today, shopId),
    _monthSummary(month, today, shopId),
    _weekSales(weekAgo, today, shopId),
    fetchBusiness(),
  ]);

  const todayData  = todayRes?.data ?? null;
  const monthData  = monthRes?.data ?? null;
  const chart      = chartRes?.results ?? [];

  const bankakSales = chart.filter(s => s.payment_method === 'bankak');
  const bankakTotal = bankakSales.reduce((s, x) => s + parseFloat(x.net_amount), 0);
  const bankakAcct  = bankakSales.find(s => s.bankak_account_snapshot)?.bankak_account_snapshot ?? null;

  const refundTotal  = parseFloat(todayData?.total_refunds ?? '0');
  const refundCount  = todayData?.refund_count ?? 0;
  const hasRefunds   = refundCount > 0;

  const business    = bizRes?.data?.[0];
  const taxEnabled  = business?.tax_enabled ?? false;
  const taxTotal    = parseFloat(todayData?.total_tax ?? '0');

  return (
    <div className={cn(
      'grid grid-cols-1 sm:grid-cols-2 gap-4',
      taxEnabled ? 'lg:grid-cols-5' : 'lg:grid-cols-4',
    )}>

      {/* Today */}
      <KpiCard
        label={t('today')}
        value={parseFloat(todayData?.total_revenue ?? '0')}
        icon={<Clock />}
        footer={
          <>
            <b className="text-foreground/80 font-semibold">{todayData?.total_sales ?? 0}</b>
            {' '}{todayData?.total_sales === 1 ? 'sale' : 'sales'}
          </>
        }
      />

      {/* This month */}
      <KpiCard
        label={t('thisMonth')}
        value={parseFloat(monthData?.total_revenue ?? '0')}
        icon={<Calendar />}
        footer={
          <>
            <b className="text-foreground/80 font-semibold">{monthData?.total_sales ?? 0}</b>
            {' '}sales · avg{' '}
            <b className="text-foreground/80 font-semibold">{fmtMoney(parseFloat(monthData?.avg_sale_value ?? '0'))}</b>
            {' '}SDG
          </>
        }
      />

      {/* Bankak balance */}
      <KpiCard
        label={t('bankakBalance')}
        value={bankakTotal}
        icon={<CreditCard />}
        footer={
          <>
            <b className="text-foreground/80 font-semibold">{bankakSales.length}</b>
            {' '}Bankak {bankakSales.length === 1 ? 'payment' : 'payments'}
            {/* S1: Bankak account ref = teal-700 mono, not success/blue */}
            {bankakAcct && (
              <a className="font-mono text-primary-700 ms-1.5 hover:underline cursor-pointer">
                · {bankakAcct}
              </a>
            )}
          </>
        }
      />

      {/* Today's refunds — S3: neutral chip when 0 */}
      <KpiCard
        label={t('refunds.todayTitle')}
        value={refundTotal}
        icon={<RotateCcw />}
        chipClass={hasRefunds
          ? 'bg-warning-light [&_svg]:text-warning'
          : 'bg-muted [&_svg]:text-muted-foreground'}
        footer={
          hasRefunds
            ? <><b className="text-foreground/80 font-semibold">{refundCount}</b> {refundCount === 1 ? t('refunds.count') : t('refunds.counts')}</>
            : <>{t('refunds.noRefunds')}</>
        }
      />

      {/* Tax collected — only when tax is enabled for this business */}
      {taxEnabled && (
        <KpiCard
          label={t('taxCollected')}
          value={taxTotal}
          icon={<Percent />}
          footer={
            <>{business?.tax_name} · {parseFloat(business?.tax_rate ?? '0')}%</>
          }
        />
      )}
    </div>
  );
}

// ── Section: 7-day bar chart + payment breakdown ──────────────────────────────

async function SalesChartSection({ shopId }: { shopId?: string }) {
  const t = await getTranslations('sales');
  const today   = toISO(new Date());
  const weekAgo = daysAgo(6);
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

      <div className="lg:col-span-3 bg-card rounded-xl border border-border shadow-xs p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[13px] font-semibold text-foreground">{t('revenueTitle')}</p>
          <p className="text-[11px] text-muted-foreground">SDG</p>
        </div>
        <SalesBarChart data={chartData} />
      </div>

      <div className="lg:col-span-2 bg-card rounded-xl border border-border shadow-xs p-5">
        <p className="text-[13px] font-semibold text-foreground mb-5">{t('byMethod')}</p>

        {pmGroups.length === 0 ? (
          <p className="text-[12px] text-muted-foreground">{t('noData')}</p>
        ) : (
          <>
            {/* S1: stacked bar — teal for bankak, slate for cash, no blue */}
            <div className="flex h-2 rounded-full overflow-hidden mb-5 gap-px">
              {pmGroups.map(g => (
                <div
                  key={g.method}
                  className={cn(
                    METHOD_BAR_CLASS[g.method] ?? 'bg-muted-foreground/30',
                    'transition-all'
                  )}
                  style={{ width: `${g.pct}%` }}
                />
              ))}
            </div>
            <div className="space-y-3">
              {pmGroups.map(g => (
                <div key={g.method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {/* S1: dot = slate for cash, teal for bankak */}
                    <span className={cn(
                      'w-2 h-2 rounded-full shrink-0',
                      METHOD_BAR_CLASS[g.method] ?? 'bg-muted-foreground/30',
                    )} />
                    <span className="text-[13px] text-foreground font-medium">
                      {METHOD_LABEL[g.method] ?? g.method}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-muted-foreground tabular-nums">{g.pct.toFixed(0)}%</span>
                    {/* S4: full numbers */}
                    <span className={cn('text-[13px] font-semibold tabular-nums num', METHOD_TEXT[g.method] ?? 'text-foreground')}>
                      {fmtMoney(g.amount)}
                      <span className="font-normal text-muted-foreground text-[10px] ms-1">SDG</span>
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

async function SalesRecentSection({ shopId, page }: { shopId?: string; page: number }) {
  const [recentRes, profileRes] = await Promise.all([
    _recentSales(shopId, page),
    import('@/services/owner').then(m => m.fetchUserProfile()),
  ]);
  const recent    = recentRes?.results ?? [];
  const count     = recentRes?.count ?? 0;
  const canRefund = profileRes?.data?.role === 'owner' || profileRes?.data?.is_staff === true;

  return (
    <>
      <SalesTableClient sales={recent} canRefund={canRefund} />
      <Pagination count={count} pageSize={PAGE_SIZE} />
    </>
  );
}

// ── Section: per-shop revenue breakdown ──────────────────────────────────────

async function SalesByShopSection({ shopId }: { shopId?: string }) {
  const t = await getTranslations('sales');
  const today = toISO(new Date());
  const res = await _monthSummary(firstOfMonth(), today, shopId);
  const breakdown = res?.data?.shops_breakdown ?? [];

  if (breakdown.length <= 1) return null;

  const maxTotal = Math.max(...breakdown.map(r => parseFloat(r.total) || 0)) || 1;

  // S1: no blue (bg-info), no purple — use teal + slate + DS status tokens only
  const SHOP_COLORS = ['bg-primary', 'bg-[#94A1B2]', 'bg-success', 'bg-warning', 'bg-[#94A1B2]/70', 'bg-danger/70'];

  return (
    <div className="bg-card rounded-xl border border-border shadow-xs p-5">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[13px] font-semibold text-foreground">{t('revenueByShop')}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">{t('thisMonthSDG')}</p>
        </div>
        <span className="text-[10px] font-semibold text-muted-foreground bg-muted/60 border border-border px-2.5 py-1 rounded-full select-none">
          {breakdown.length} shops
        </span>
      </div>

      <div className="space-y-3">
        {breakdown.map((row, i) => {
          const amount = parseFloat(row.total) || 0;
          const pct    = (amount / maxTotal) * 100;
          const color  = SHOP_COLORS[i % SHOP_COLORS.length];

          return (
            <div key={row.shop_id}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={cn('w-2 h-2 rounded-full shrink-0', color)} />
                  <span className="text-[12px] font-semibold text-foreground truncate">
                    {row.shop_name}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {row.count} {row.count === 1 ? 'sale' : 'sales'}
                  </span>
                </div>
                {/* S4: full numbers */}
                <span className="text-[13px] font-semibold tabular-nums text-foreground ms-3 shrink-0 num">
                  {fmtMoney(amount)}
                  <span className="text-[10px] font-normal text-muted-foreground ms-1">SDG</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-muted/40 overflow-hidden">
                <div className={cn('h-full rounded-full opacity-70 transition-all', color)} style={{ width: `${pct}%` }} />
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
    <div className="bg-card rounded-xl border border-border p-5 space-y-4 animate-pulse">
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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="bg-card rounded-xl border border-border p-4 space-y-3 animate-pulse">
          <div className="flex items-center justify-between">
            <div className="h-2.5 w-16 rounded bg-muted" />
            <div className="w-[30px] h-[30px] rounded-lg bg-muted" />
          </div>
          <div className="h-7 w-28 rounded bg-muted" />
          <div className="h-2.5 w-24 rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}
