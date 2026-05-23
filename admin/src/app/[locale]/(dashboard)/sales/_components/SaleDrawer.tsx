'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Drawer from '@/components/ds/Drawer';
import Avatar from '@/components/ui/Avatar';
import { refundSaleAction } from '@/actions/sales';
import type { Sale } from '@/types/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  completed:      'bg-success/10 text-success',
  pending:        'bg-warning/10 text-warning',
  cancelled:      'bg-danger/10 text-danger',
  refunded:       'bg-info/10 text-info',
  partial_refund: 'bg-orange-100 text-orange-600',
};

const METHOD_LABEL: Record<string, string> = {
  cash:           'Cash',
  bankak:         'Bankak',
  card:           'Card',
  bank_transfer:  'Bank',
  mobile_wallet:  'Mobile',
  loyalty_points: 'Points',
  split:          'Split',
  credit:         'Credit',
};

// ── Public component ──────────────────────────────────────────────────────────

interface Props {
  sale:      Sale;
  canRefund: boolean;
  onClose:   () => void;
}

export default function SaleDrawer({ sale, canRefund, onClose }: Props) {
  const t = useTranslations('sales');
  return (
    <Drawer
      open
      onClose={onClose}
      title={t('drawer.title')}
      subtitle={sale.receipt_number}
    >
      {/* key={sale.id} resets all state when a different row is selected */}
      <DrawerContent key={sale.id} sale={sale} canRefund={canRefund} onClose={onClose} />
    </Drawer>
  );
}

// ── Inner stateful content ────────────────────────────────────────────────────

type Mode = 'view' | 'refund' | 'pending';

interface QtyEntry {
  product:      string;
  product_name: string;
  unit_price:   string;
  max:          number;
  qty:          number;
}

function DrawerContent({ sale, canRefund, onClose }: Props) {
  const t = useTranslations('sales');
  const router = useRouter();

  const [mode, setMode]   = useState<Mode>('view');
  const [error, setError] = useState<string | null>(null);
  const [qtys, setQtys]   = useState<QtyEntry[]>(() =>
    sale.items.map(item => ({
      product:      item.product,
      product_name: item.product_name,
      unit_price:   item.unit_price,
      max:          Math.round(parseFloat(item.quantity)),
      qty:          Math.round(parseFloat(item.quantity)),
    }))
  );

  const refundTotal = qtys.reduce(
    (sum, e) => sum + e.qty * parseFloat(e.unit_price),
    0,
  );
  const hasItems      = qtys.some(e => e.qty > 0);
  const isPending     = mode === 'pending';
  const canInitRefund = canRefund && (sale.status === 'completed' || sale.status === 'partial_refund');

  function setQty(idx: number, raw: string) {
    const v = Math.min(qtys[idx].max, Math.max(0, parseInt(raw, 10) || 0));
    setQtys(prev => prev.map((q, i) => i === idx ? { ...q, qty: v } : q));
  }

  async function handleConfirm() {
    const items = qtys
      .filter(e => e.qty > 0)
      .map(e => ({ product: e.product, quantity: e.qty }));

    setMode('pending');
    setError(null);

    const result = await refundSaleAction(sale.id, items);

    if (!result || !result.ok) {
      setError(result?.error ?? 'Refund failed.');
      setMode('refund');
    } else {
      onClose();
      router.refresh();
    }
  }

  const isRefundMode = mode === 'refund' || mode === 'pending';

  return (
    <div className="space-y-5">

      {/* ── Header row ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Avatar name={sale.cashier_name} size={28} />
          <div>
            <p className="text-[13px] font-semibold text-text-primary">{sale.cashier_name}</p>
            <p className="text-[11px] text-text-hint">{t('drawer.cashier')}</p>
          </div>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[sale.status] ?? 'bg-surface-muted text-text-hint'}`}>
          {sale.status.replace('_', ' ')}
        </span>
      </div>

      {/* ── Meta row ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[11px] text-text-hint mb-0.5">{t('drawer.method')}</p>
          <p className="text-[12px] font-semibold text-text-primary">
            {METHOD_LABEL[sale.payment_method] ?? sale.payment_method}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-text-hint mb-0.5">{t('columns.date')}</p>
          <p className="text-[12px] font-semibold text-text-primary">
            {new Date(sale.created_at).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* ── Items ───────────────────────────────────────────────────────── */}
      <div>
        <p className="text-[10px] font-black tracking-[.14em] uppercase text-text-hint mb-2">
          {t('drawer.items')} ({sale.item_count})
        </p>

        <div className="space-y-2">
          {!isRefundMode
            ? sale.items.map(item => (
                <div key={item.id} className="flex items-center justify-between bg-surface-soft rounded-lg px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium text-text-primary truncate">{item.product_name}</p>
                    <p className="text-[11px] text-text-hint">
                      {item.unit_price} SDG × {item.quantity}
                    </p>
                  </div>
                  <p className="text-[13px] font-bold text-text-primary tabular-nums ms-3">
                    {item.subtotal}
                  </p>
                </div>
              ))
            : qtys.map((entry, idx) => (
                <div key={entry.product} className="flex items-center justify-between bg-surface-soft rounded-lg px-3 py-2.5 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-text-primary truncate">{entry.product_name}</p>
                    <p className="text-[11px] text-text-hint">
                      {entry.unit_price} SDG · max {entry.max}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <p className="text-[10px] text-text-hint">{t('drawer.qtyLabel')}</p>
                    <input
                      type="number"
                      dir="ltr"
                      min={0}
                      max={entry.max}
                      value={entry.qty}
                      disabled={isPending}
                      onChange={e => setQty(idx, e.target.value)}
                      className="w-14 text-center border border-border-soft rounded-md px-2 py-1 text-[12px] focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 bg-white"
                    />
                  </div>
                </div>
              ))
          }
        </div>
      </div>

      {/* ── Total row ───────────────────────────────────────────────────── */}
      <div className="border-t border-border-soft pt-3 flex items-center justify-between">
        <p className="text-[12px] text-text-hint">
          {isRefundMode ? t('drawer.refundTotal') : t('columns.amount')}
        </p>
        <p className="text-[16px] font-black text-text-primary tabular-nums">
          {isRefundMode
            ? refundTotal.toFixed(2)
            : parseFloat(sale.net_amount).toFixed(2)
          }
          <span className="text-[11px] font-normal text-text-hint ms-1">SDG</span>
        </p>
      </div>

      {/* ── Error banner ────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-danger/5 border border-danger/20 text-danger text-[12px] rounded-lg px-3 py-2.5">
          {error}
        </div>
      )}

      {/* ── CTA buttons ─────────────────────────────────────────────────── */}
      {mode === 'view' && canInitRefund && (
        <button
          onClick={() => setMode('refund')}
          className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-[13px] py-2.5 rounded-xl transition-colors"
        >
          {t('drawer.refundBtn')}
        </button>
      )}

      {isRefundMode && (
        <div className="flex gap-2">
          <button
            onClick={() => { setMode('view'); setError(null); }}
            disabled={isPending}
            className="flex-1 border border-border-soft text-text-secondary font-semibold text-[13px] py-2.5 rounded-xl hover:bg-surface-soft transition-colors disabled:opacity-50"
          >
            {t('drawer.cancel')}
          </button>
          <button
            onClick={handleConfirm}
            disabled={!hasItems || isPending}
            className="flex-1 bg-danger hover:bg-danger/90 active:bg-danger text-white font-semibold text-[13px] py-2.5 rounded-xl transition-colors disabled:opacity-40"
          >
            {isPending
              ? '…'
              : `${t('drawer.confirmRefund')} · ${refundTotal.toFixed(0)} SDG`
            }
          </button>
        </div>
      )}

    </div>
  );
}
