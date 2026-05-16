'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchStockLevelsAction } from '@/actions/inventory';
import type { Shop, StockLevel } from '@/types/api';

interface Props {
  shops:   Shop[];
  status?: 'low_stock' | 'out_of_stock';
}

export default function StockDrawerContent({ shops, status }: Props) {
  const t = useTranslations('inventory');
  const [items,   setItems]   = useState<StockLevel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);
  const [shopId,  setShopId]  = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchStockLevelsAction({
      status: status,
      shop:   shopId || undefined,
      limit:  50,
    });
    if (res.ok) setItems(res.data);
    else        setError(res.error);
    setLoading(false);
  }, [status, shopId]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="p-5 flex flex-col gap-4">
      {shops.length > 1 && (
        <select
          value={shopId}
          onChange={e => setShopId(e.target.value)}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">{t('lowStock.shopFilter')}</option>
          {shops.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      )}

      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-[52px] rounded-xl bg-muted animate-pulse" />)}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertCircle size={14} className="text-destructive shrink-0" />
          <p className="text-xs font-semibold text-destructive flex-1">{error}</p>
          <button type="button" onClick={load} className="text-xs text-primary hover:underline">
            {t('common.retry')}
          </button>
        </div>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-12">
          {t('lowStock.empty')}
        </p>
      ) : (
        <div className="space-y-2">
          {items.map(item => (
            <div key={item.id} className="flex items-center gap-3 px-3.5 py-3 rounded-xl border border-border bg-card">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-semibold text-foreground truncate">{item.product_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {item.shop_name}
                  {item.product_sku ? ` · ${item.product_sku}` : ''}
                </p>
              </div>
              <span className={cn(
                'text-[14px] font-bold tabular-nums',
                item.is_out_of_stock ? 'text-destructive' :
                item.is_low_stock    ? 'text-amber-600'   : 'text-success',
              )}>
                {item.quantity}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
