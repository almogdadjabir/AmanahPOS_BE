import { fetchOwnerDashboard } from '@/services/owner';
import { formatCurrency } from '@/lib/formatters';
import { getTranslations } from 'next-intl/server';
import type { BusinessType, Sale, StockLevel, Subscription } from '@/types/api';
import RevenueLineChart from './RevenueLineChart';
import StatCard from '@/components/ds/StatCard';
import EmptyState from '@/components/ds/EmptyState';
import { Badge } from '@/components/ui/badge';
import Avatar from '@/components/ui/Avatar';

interface Props {
  businessType?: BusinessType;
  selectedShop?: string;
}

export default async function OwnerOverview({ businessType, selectedShop }: Props) {
  const t = await getTranslations('dashboard');
  // Only show inventory features when we are CERTAIN the business type is 'shop'.
  // Unknown type defaults to hiding inventory (safer than accidentally showing stock data).
  const isRestaurant = businessType !== 'shop';

  const {
    todaySummary,
    monthSummary,
    recentSales,
    lowStockItems,
    lowStockCount,
    subscription,
    chartData,
  } = await fetchOwnerDashboard(selectedShop);

  const todayRevenue = parseFloat(todaySummary?.total_revenue ?? '0');
  const monthRevenue = parseFloat(monthSummary?.total_revenue ?? '0');
  const todaySales   = todaySummary?.total_sales ?? 0;
  const monthSales   = monthSummary?.total_sales ?? 0;
  const avgSale      = parseFloat(monthSummary?.avg_sale_value ?? '0');

  return (
    <div className="space-y-5">

      {/* ── Subscription status banner ────────────────────────────────────── */}
      {subscription && <SubscriptionBanner sub={subscription} />}

      {/* ── KPI cards ─────────────────────────────────────────────────────── */}
      <div className={`grid gap-4 ${isRestaurant ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2 xl:grid-cols-4'}`}>
        <StatCard
          label={t('owner.todayRevenue')}
          value={formatCurrency(todayRevenue)}
          sub={`${todaySales} ${t('owner.completedSales')}`}
          icon={<CashIcon />}
          accent="text-primary bg-primary-soft"
        />
        <StatCard
          label={t('owner.monthlyRevenue')}
          value={formatCurrency(monthRevenue)}
          sub={`${monthSales} ${t('owner.completedSales')}`}
          icon={<TrendIcon />}
          accent="text-info bg-info-light"
        />
        <StatCard
          label={t('owner.avgSale')}
          value={formatCurrency(avgSale)}
          sub={t('owner.completedSales')}
          icon={<AvgIcon />}
          accent="text-warning bg-warning-light"
        />
        {!isRestaurant && (
          <StatCard
            label={t('owner.lowStock')}
            value={String(lowStockCount)}
            sub={t('owner.needsRestock')}
            icon={<AlertIcon />}
            accent={lowStockCount > 0 ? 'text-danger bg-danger-light' : 'text-success bg-success-light'}
          />
        )}
      </div>

      {/* ── Charts row ────────────────────────────────────────────────────── */}
      <div className={`grid grid-cols-1 gap-4 ${!isRestaurant ? 'lg:grid-cols-3' : ''}`}>

        {/* Revenue chart */}
        <div className={`bg-white rounded-xl border border-border-soft shadow-card p-4 ${!isRestaurant ? 'lg:col-span-2' : ''}`}>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-[13px] font-semibold text-text-primary">{t('owner.dailyRevenue')}</p>
              <p className="text-xs text-text-hint mt-0.5">
                {t('owner.last30Days')}
                {selectedShop && (
                  <span className="ml-1.5 text-primary font-semibold">· {t('owner.filtered')}</span>
                )}
              </p>
            </div>
            <div className="text-end">
              <p className="text-lg font-bold text-text-primary">{formatCurrency(monthRevenue)}</p>
              <p className="text-[11px] text-text-hint">{monthSales} transactions</p>
            </div>
          </div>
          {chartData.every(d => d.revenue === 0)
            ? (
              <EmptyState
                icon={<TrendIcon />}
                title={t('owner.noSalesData')}
                description={t('owner.noSalesDataDesc')}
              />
            ) : <RevenueLineChart data={chartData} />
          }
        </div>

        {/* Low stock — shops only */}
        {!isRestaurant && (
          <div className="bg-white rounded-xl border border-border-soft shadow-card p-4 flex flex-col">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-[13px] font-semibold text-text-primary">{t('owner.lowStockTitle')}</p>
                <p className="text-xs text-text-hint mt-0.5">{t('owner.lowStockSub')}</p>
              </div>
              {lowStockCount > 0 && <Badge dot variant="danger">{lowStockCount}</Badge>}
            </div>

            {lowStockItems.length === 0 ? (
              <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
                <div className="w-10 h-10 rounded-full bg-success-light text-success flex items-center justify-center mb-3">
                  <CheckIcon />
                </div>
                <p className="text-[13px] font-medium text-text-primary">{t('owner.allStocked')}</p>
                <p className="text-xs text-text-hint mt-1">{t('owner.allStockedDesc')}</p>
              </div>
            ) : (
              <div className="flex-1 space-y-2 overflow-y-auto">
                {lowStockItems.map(item => <LowStockRow key={item.id} item={item} />)}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Recent sales ──────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-border-soft shadow-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border-soft flex items-center justify-between">
          <div>
            <p className="text-[13px] font-semibold text-text-primary">{t('owner.recentSales')}</p>
            <p className="text-xs text-text-hint mt-0.5">{t('owner.latestTxns')}</p>
          </div>
          <a href="sales" className="text-xs font-semibold text-primary hover:underline">{t('owner.viewAll')}</a>
        </div>

        {recentSales.length === 0 ? (
          <EmptyState
            icon={<ReceiptIcon />}
            title={t('owner.noSalesYet')}
            description={t('owner.noSalesDesc')}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-soft">
                  {[t('owner.receipt'), t('owner.cashier'), 'Method', t('owner.items'), 'Amount', 'Time'].map(h => (
                    <th key={h} className="text-start px-4 py-2.5 text-[11px] font-semibold text-text-hint uppercase tracking-wider last:text-end">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border-soft">
                {recentSales.map(sale => <SaleRow key={sale.id} sale={sale} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

async function SubscriptionBanner({ sub }: { sub: Subscription }) {
  const t = await getTranslations('dashboard');
  const expired = sub.is_expired;
  const warning = !expired && sub.days_remaining <= 7;

  if (!expired && !warning) return null;

  return (
    <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 ${
      expired  ? 'bg-danger-light border-danger/20'
      : warning ? 'bg-warning-light border-warning/20'
      : ''
    }`}>
      <AlertIcon />
      <div className="flex-1">
        <p className={`text-[13px] font-semibold ${expired ? 'text-danger' : 'text-warning'}`}>
          {expired
            ? `${t('owner.subExpired')} · ${sub.plan.name}`
            : `${t('owner.subExpiringSoon')} ${sub.days_remaining} ${t('owner.days')}`}
        </p>
        <p className="text-xs text-text-secondary mt-0.5">
          {expired ? t('owner.renewExpired') : `${t('owner.planLabel')}: ${sub.plan.name} — ${t('owner.considerRenewing')}`}
        </p>
      </div>
      <a href="subscription" className="text-xs font-semibold text-primary underline shrink-0">
        {t('owner.manage')}
      </a>
    </div>
  );
}

function SaleRow({ sale }: { sale: Sale }) {
  const time = new Date(sale.created_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const methods: Record<string, string> = {
    cash: 'Cash', card: 'Card', bank_transfer: 'Bank',
    mobile_wallet: 'Mobile', loyalty_points: 'Points', split: 'Split', credit: 'Credit',
  };
  return (
    <tr className="hover:bg-surface-soft transition-colors">
      <td className="px-4 py-3 font-mono text-xs text-text-hint">{sale.receipt_number}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Avatar name={sale.cashier_name} size={24} />
          <span className="text-[13px] text-text-primary">{sale.cashier_name}</span>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-surface-muted text-[11px] font-medium text-text-secondary">
          {methods[sale.payment_method] ?? sale.payment_method}
        </span>
      </td>
      <td className="px-4 py-3 text-[13px] text-text-secondary">{sale.item_count}</td>
      <td className="px-4 py-3 font-semibold text-text-primary text-[13px]">{formatCurrency(parseFloat(sale.net_amount))}</td>
      <td className="px-4 py-3 text-xs text-text-hint text-end">{time}</td>
    </tr>
  );
}

function LowStockRow({ item }: { item: StockLevel }) {
  return (
    <div className="flex items-center justify-between gap-3 p-2.5 rounded-lg bg-surface-soft">
      <div className="min-w-0">
        <p className="text-[13px] font-medium text-text-primary truncate">{item.product_name}</p>
        <p className="text-[11px] text-text-hint mt-0.5">{item.shop_name}</p>
      </div>
      <Badge dot variant={item.is_out_of_stock ? 'danger' : 'warning'} className="shrink-0">
        {item.is_out_of_stock ? 'Out' : item.quantity}
      </Badge>
    </div>
  );
}

function CashIcon()    { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function TrendIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/><polyline points="16 7 22 7 22 13"/></svg>; }
function AvgIcon()     { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>; }
function AlertIcon()   { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>; }
function CheckIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 5 5L20 7"/></svg>; }
function ReceiptIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>; }
