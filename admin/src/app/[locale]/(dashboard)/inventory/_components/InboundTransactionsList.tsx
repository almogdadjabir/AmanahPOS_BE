'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { fetchInboundListAction } from '@/actions/inventory';
import type { InboundTransaction } from '@/types/api';
import InboundTransactionDetailDrawer from './InboundTransactionDetailDrawer';

export default function InboundTransactionsList() {
  const t = useTranslations('inventory');
  const [transactions, setTransactions] = useState<InboundTransaction[]>([]);
  const [page,        setPage]          = useState(1);
  const [total,       setTotal]         = useState(0);
  const [loading,     setLoading]       = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [error,       setError]         = useState<string | null>(null);
  const [selectedId,  setSelectedId]    = useState<string | null>(null);

  async function load(p: number, append = false) {
    if (p === 1) setLoading(true);
    else         setLoadingMore(true);
    setError(null);

    const res = await fetchInboundListAction({ page: p });
    if (res.ok) {
      setTransactions(prev => append ? [...prev, ...res.data] : res.data);
      setTotal(res.count);
    } else {
      setError(res.error);
    }

    setLoading(false);
    setLoadingMore(false);
  }

  useEffect(() => { load(1); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const hasMore = transactions.length < total;

  function loadMore() {
    const next = page + 1;
    setPage(next);
    load(next, true);
  }

  if (loading) {
    return <div className="h-24 rounded-xl bg-muted animate-pulse mt-5" />;
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3 mt-5">
        <AlertCircle size={14} className="text-destructive shrink-0" />
        <p className="text-xs font-semibold text-destructive flex-1">{error}</p>
        <button
          type="button"
          onClick={() => load(1)}
          className="text-xs text-primary hover:underline"
        >
          {t('common.retry')}
        </button>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic text-center py-8 mt-5">
        {t('inboundList.empty')}
      </p>
    );
  }

  return (
    <div className="mt-5">
      <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-3">
        {t('inboundList.title')}
      </p>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-[1.5fr_1fr_1fr_3rem_5rem_5rem] gap-3 px-4 py-2.5 bg-muted/50 border-b border-border">
          {[
            t('inboundList.colReference'),
            t('inboundList.colVendor'),
            t('inboundList.colShop'),
            t('inboundList.colItems'),
            t('inboundList.colQty'),
            t('inboundList.colDate'),
          ].map((h, i) => (
            <span key={i} className="text-[11px] font-semibold text-muted-foreground">{h}</span>
          ))}
        </div>

        {/* Data rows */}
        {transactions.map(txn => (
          <button
            key={txn.id}
            type="button"
            onClick={() => setSelectedId(txn.id)}
            className="w-full grid grid-cols-[1.5fr_1fr_1fr_3rem_5rem_5rem] gap-3 px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors text-left items-center"
          >
            <span className="text-[13px] font-semibold text-foreground truncate">{txn.reference}</span>
            <span className="text-[12px] text-muted-foreground truncate">{txn.vendor?.name ?? '—'}</span>
            <span className="text-[12px] text-muted-foreground truncate">{txn.shop_name}</span>
            <span className="text-[12px] text-muted-foreground">{txn.item_count}</span>
            <span className="text-[12px] text-muted-foreground">{txn.total_quantity}</span>
            <span className="text-[11px] text-muted-foreground">
              {new Date(txn.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </button>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={loadMore}
          disabled={loadingMore}
          className="mt-3 w-full py-2 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
        >
          {loadingMore ? '…' : t('inboundList.loadMore')}
        </button>
      )}

      <InboundTransactionDetailDrawer
        id={selectedId}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}
