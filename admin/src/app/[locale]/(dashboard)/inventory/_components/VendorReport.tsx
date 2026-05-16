'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  fetchVendorSummaryAction,
  type VendorSummaryParams,
} from '@/actions/inventory';
import type { Shop, VendorSummaryData } from '@/types/api';

interface Props {
  shops: Shop[];
}

export default function VendorReport({ shops }: Props) {
  const t = useTranslations('inventory');

  // Applied filters — trigger re-fetch when changed
  const [shopId,   setShopId]   = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');

  // Pending filters — only applied on "Apply" click
  const [pendingShopId,   setPendingShopId]   = useState('');
  const [pendingDateFrom, setPendingDateFrom] = useState('');
  const [pendingDateTo,   setPendingDateTo]   = useState('');

  const [data,    setData]    = useState<VendorSummaryData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const params: VendorSummaryParams = {
      shop_id:   shopId   || undefined,
      date_from: dateFrom || undefined,
      date_to:   dateTo   || undefined,
    };
    const res = await fetchVendorSummaryAction(params);
    if (res.ok) setData(res.data);
    else        setError(res.error);
    setLoading(false);
  }, [shopId, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  function applyFilters() {
    setShopId(pendingShopId);
    setDateFrom(pendingDateFrom);
    setDateTo(pendingDateTo);
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        {shops.length > 1 && (
          <select
            value={pendingShopId}
            onChange={e => setPendingShopId(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{t('reports.shopFilter')}</option>
            {shops.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground shrink-0">{t('reports.dateFrom')}</label>
          <input
            type="date"
            value={pendingDateFrom}
            onChange={e => setPendingDateFrom(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground shrink-0">{t('reports.dateTo')}</label>
          <input
            type="date"
            value={pendingDateTo}
            onChange={e => setPendingDateTo(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <Button size="sm" onClick={applyFilters} disabled={loading}>
          {t('reports.apply')}
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="h-20 rounded-xl bg-muted animate-pulse" />
            <div className="h-20 rounded-xl bg-muted animate-pulse" />
          </div>
          <div className="h-40 rounded-xl bg-muted animate-pulse" />
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertCircle size={14} className="text-destructive shrink-0" />
          <p className="text-xs font-semibold text-destructive flex-1">{error}</p>
          <button type="button" onClick={load} className="text-xs text-primary hover:underline">
            {t('common.retry')}
          </button>
        </div>
      ) : !data || data.vendors.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-12">
          {t('reports.empty')}
        </p>
      ) : (
        <>
          {/* KPI mini-row */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">{t('reports.totalTransactions')}</p>
              <p className="text-[26px] font-bold text-foreground tabular-nums mt-1">{data.total_transactions}</p>
            </div>
            <div className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs font-medium text-muted-foreground">{t('reports.totalUnits')}</p>
              <p className="text-[26px] font-bold text-foreground tabular-nums mt-1">{data.total_quantity}</p>
            </div>
          </div>

          {/* Vendor table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-2.5 bg-muted/50 border-b border-border">
              {[t('reports.colVendor'), t('reports.colTransactions'), t('reports.colTotalQty')].map((h, i) => (
                <span key={i} className="text-[11px] font-semibold text-muted-foreground">{h}</span>
              ))}
            </div>
            {data.vendors.map(vendor => (
              <div
                key={vendor.vendor_id}
                className="grid grid-cols-[2fr_1fr_1fr] gap-3 px-4 py-3 border-b border-border last:border-0 items-center"
              >
                <span className="text-[13px] font-semibold text-foreground truncate">{vendor.vendor_name}</span>
                <span className="text-[12px] text-muted-foreground">{vendor.transactions_count}</span>
                <span className="text-[12px] text-muted-foreground">{vendor.total_quantity}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
