'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchStockLevelsAction } from '@/actions/inventory';
import type { Shop, StockLevel } from '@/types/api';

interface Props {
  shops:     Shop[];
  onReceive: (productName: string, quantity: string) => void;
}

export default function LowStockList({ shops, onReceive }: Props) {
  const t = useTranslations('inventory');
  const [items,       setItems]       = useState<StockLevel[]>([]);
  const [page,        setPage]        = useState(1);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const [rawSearch,   setRawSearch]   = useState('');
  const [search,      setSearch]      = useState('');
  const [shopId,      setShopId]      = useState('');
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async (p: number, append = false) => {
    if (p === 1) setLoading(true);
    else         setLoadingMore(true);
    setError(null);

    const res = await fetchStockLevelsAction({
      status: 'low_stock',
      search: search || undefined,
      shop:   shopId || undefined,
      page:   p,
      limit:  50,
    });

    if (res.ok) {
      setItems(prev => append ? [...prev, ...res.data] : res.data);
      setTotal(res.count);
    } else {
      setError(res.error);
    }

    setLoading(false);
    setLoadingMore(false);
  }, [search, shopId]);

  useEffect(() => { load(1); setPage(1); }, [load]);

  useEffect(() => {
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, []);

  function handleSearchChange(val: string) {
    setRawSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 300);
  }

  function loadMore() {
    const next = page + 1;
    setPage(next);
    load(next, true);
  }

  return (
    <div>
      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={rawSearch}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder={t('lowStock.searchPlaceholder')}
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        />
        {shops.length > 1 && (
          <select
            value={shopId}
            onChange={e => setShopId(e.target.value)}
            className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <option value="">{t('lowStock.shopFilter')}</option>
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
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-12">
          {t('lowStock.empty')}
        </p>
      ) : (
        <>
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-2.5 bg-muted/50 border-b border-border">
              {[
                t('lowStock.colProduct'),
                t('lowStock.colSku'),
                t('lowStock.colShop'),
                t('lowStock.colQty'),
                t('lowStock.colStatus'),
              ].map((h, i) => (
                <span key={i} className="text-[11px] font-semibold text-muted-foreground">{h}</span>
              ))}
            </div>
            {items.map(item => (
              <div
                key={item.id}
                className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 px-4 py-3 border-b border-border last:border-0 items-center"
              >
                <span className="text-[13px] font-semibold text-foreground truncate">{item.product_name}</span>
                <span className="text-[12px] text-muted-foreground truncate">{item.product_sku || '—'}</span>
                <span className="text-[12px] text-muted-foreground truncate">{item.shop_name}</span>
                <span className={cn(
                  'text-[13px] font-bold',
                  item.is_out_of_stock ? 'text-destructive' : 'text-amber-600',
                )}>
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => onReceive(item.product_name, item.quantity)}
                  className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition-colors shrink-0"
                  style={{
                    background: 'linear-gradient(135deg, rgb(180,83,9), rgb(146,64,14))',
                    color:      'white',
                  }}
                >
                  {t('lowStock.receive')}
                </button>
              </div>
            ))}
          </div>
          {items.length < total && (
            <button
              type="button"
              onClick={loadMore}
              disabled={loadingMore}
              className="mt-3 w-full py-2 text-xs font-semibold text-primary hover:underline disabled:opacity-50"
            >
              {loadingMore ? '…' : t('lowStock.loadMore')}
            </button>
          )}
        </>
      )}
    </div>
  );
}
