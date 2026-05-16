'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Drawer from '@/components/ds/Drawer';
import { fetchInboundTransactionAction } from '@/actions/inventory';
import type { InboundTransaction } from '@/types/api';

interface Props {
  id:      string | null;
  onClose: () => void;
}

export default function InboundTransactionDetailDrawer({ id, onClose }: Props) {
  const t = useTranslations('inventory');
  const [txn,     setTxn]     = useState<InboundTransaction | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (!id) { setTxn(null); return; }
    let ignored = false;
    setLoading(true);
    setError(null);
    fetchInboundTransactionAction(id).then(res => {
      if (ignored) return;
      if (res.ok) setTxn(res.data);
      else        setError(res.error);
      setLoading(false);
    });
    return () => { ignored = true; };
  }, [id]);

  return (
    <Drawer
      open={!!id}
      onClose={onClose}
      title={t('inboundList.drawerTitle')}
      subtitle={txn?.reference}
    >
      {loading && <div className="h-40 rounded-xl bg-muted animate-pulse m-5" />}
      {error   && <p className="text-xs text-destructive p-5">{error}</p>}
      {txn && (
        <div className="p-5 space-y-5">
          {/* Header meta */}
          <div className="space-y-2">
            {txn.vendor && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground w-24 shrink-0">{t('inboundList.vendor')}</span>
                <span className="text-xs font-semibold">
                  {txn.vendor.name}{txn.vendor.phone ? ` · ${txn.vendor.phone}` : ''}
                </span>
              </div>
            )}
            <div className="flex items-start gap-2">
              <span className="text-xs text-muted-foreground w-24 shrink-0">{t('inbound.shop')}</span>
              <span className="text-xs font-semibold">{txn.shop_name}</span>
            </div>
            {txn.notes && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground w-24 shrink-0">{t('inboundList.notes')}</span>
                <span className="text-xs">{txn.notes}</span>
              </div>
            )}
            {txn.created_by_name && (
              <div className="flex items-start gap-2">
                <span className="text-xs text-muted-foreground w-24 shrink-0">{t('inboundList.createdBy')}</span>
                <span className="text-xs">{txn.created_by_name}</span>
              </div>
            )}
          </div>

          {/* Items table */}
          <div>
            <p className="text-xs font-bold text-foreground uppercase tracking-wide mb-2">
              {t('inboundList.items')}
            </p>
            <div className="rounded-lg border border-border overflow-hidden">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 px-3 py-2 bg-muted/50 border-b border-border">
                {[
                  t('inboundList.colProduct'),
                  t('inbound.quantity'),
                  t('inboundList.colUnitCost'),
                  t('inboundList.colExpiry'),
                  t('inboundList.colBatch'),
                ].map((h, i) => (
                  <span key={i} className="text-[10px] font-semibold text-muted-foreground">{h}</span>
                ))}
              </div>
              {txn.items.map(item => (
                <div
                  key={item.id}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr] gap-2 px-3 py-2.5 border-b border-border last:border-0"
                >
                  <span className="text-[12px] font-medium truncate">{item.product_name}</span>
                  <span className="text-[12px] text-muted-foreground">{item.quantity}</span>
                  <span className="text-[12px] text-muted-foreground">{item.unit_cost ?? '—'}</span>
                  <span className="text-[12px] text-muted-foreground">{item.expiry_date ?? '—'}</span>
                  <span className="text-[12px] text-muted-foreground">{item.batch_number || '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Drawer>
  );
}
