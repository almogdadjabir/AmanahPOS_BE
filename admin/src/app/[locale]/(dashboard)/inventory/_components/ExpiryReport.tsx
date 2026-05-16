'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchExpiryReportAction, type ExpiryReportParams } from '@/actions/inventory';
import type { ExpiryBatch, Shop } from '@/types/api';

type StatusFilter = 'all' | 'expiring_soon' | 'expired';

interface Props {
  shops: Shop[];
}

export default function ExpiryReport({ shops }: Props) {
  const t      = useTranslations('inventory');
  const [batches,     setBatches]     = useState<ExpiryBatch[]>([]);
  const [page,        setPage]        = useState(1);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [status,      setStatus]      = useState<StatusFilter>('all');
  const [shopId,      setShopId]      = useState('');

  const load = useCallback(async (p: number, append = false) => {
    if (p === 1) setLoading(true);
    else         setLoadingMore(true);
    setError(null);

    const params: ExpiryReportParams = {
      status:  status,
      shop_id: shopId || undefined,
      page:    p,
    };

    const res = await fetchExpiryReportAction(params);
    if (res.ok) {
      setBatches(prev => append ? [...prev, ...res.data] : res.data);
      setTotal(res.count);
    } else {
      setError(res.error);
    }

    setLoading(false);
    setLoadingMore(false);
  }, [status, shopId]);

  useEffect(() => { load(1); setPage(1); }, [load]);

  function changeStatus(s: StatusFilter) { setStatus(s); }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    load(next, true);
  }

  const STATUS_TABS: { value: StatusFilter; label: string }[] = [
    { value: 'all',           label: t('expiry.filterAll') },
    { value: 'expiring_soon', label: t('expiry.filterExpiringSoon') },
    { value: 'expired',       label: t('expiry.filterExpired') },
  ];

  const emptyMsg =
    status === 'expiring_soon' ? t('expiry.emptyExpiringSoon') :
    status === 'expired'       ? t('expiry.emptyExpired')      :
                                 t('expiry.emptyAll');

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="flex items-center gap-1 p-1 rounded-lg bg-muted border border-border">
          {STATUS_TABS.map(tab => (
            <button
              key={tab.value}
              type="button"
              onClick={() => changeStatus(tab.value)}
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-semibold transition-all duration-150',
                status === tab.value
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
        {shops.length > 1 && (
          <select
            value={shopId}
            onChange={e => setShopId(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{t('expiry.shopFilter')}</option>
            {shops.map(s => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map(i => <div key={i} className="h-12 rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertCircle size={14} className="text-destructive shrink-0" />
          <p className="text-xs font-semibold text-destructive flex-1">{error}</p>
          <button type="button" onClick={() => load(1)} className="text-xs text-primary hover:underline">
            {t('common.retry')}
          </button>
        </div>
      ) : batches.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-12">{emptyMsg}</p>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-2.5 bg-muted/50 border-b border-border">
              {[
                t('expiry.colProduct'),
                t('expiry.colSku'),
                t('expiry.colShop'),
                t('expiry.colBatch'),
                t('expiry.colQty'),
                t('expiry.colDays'),
              ].map((h, i) => (
                <span key={i} className="text-[11px] font-semibold text-muted-foreground">{h}</span>
              ))}
            </div>
            {batches.map(batch => (
              <div
                key={batch.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr] gap-3 px-4 py-3 border-b border-border last:border-0 items-center"
              >
                <span className="text-[13px] font-medium truncate">{batch.product_name}</span>
                <span className="text-[12px] text-muted-foreground truncate">{batch.product_sku || '—'}</span>
                <span className="text-[12px] text-muted-foreground truncate">{batch.shop_name}</span>
                <span className="text-[12px] text-muted-foreground">{batch.batch_number || '—'}</span>
                <span className="text-[12px] text-muted-foreground">{batch.quantity}</span>
                <span className={cn(
                  'text-[12px] font-semibold',
                  batch.days_remaining < 0   ? 'text-destructive' :
                  batch.days_remaining <= 30 ? 'text-amber-600'   : 'text-success',
                )}>
                  {batch.days_remaining < 0
                    ? `${Math.abs(batch.days_remaining)}d ago`
                    : `${batch.days_remaining}d`}
                </span>
              </div>
            ))}
          </div>
          {batches.length < total && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-3 w-full py-2 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
            >
              {loadingMore ? '…' : t('expiry.loadMore')}
            </button>
          )}
        </>
      )}
    </div>
  );
}
