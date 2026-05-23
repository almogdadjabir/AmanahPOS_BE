'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import Drawer from '@/components/ds/Drawer';
import Avatar from '@/components/ui/Avatar';
import { refundSaleAction } from '@/actions/sales';
import type { Sale } from '@/types/api';

// ── Design tokens ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { pill: string; dot: string }> = {
  completed:      { pill: 'bg-emerald-50 text-emerald-700 border-emerald-100',  dot: 'bg-emerald-500' },
  pending:        { pill: 'bg-amber-50 text-amber-700 border-amber-100',        dot: 'bg-amber-400' },
  cancelled:      { pill: 'bg-red-50 text-red-600 border-red-100',              dot: 'bg-red-400' },
  refunded:       { pill: 'bg-sky-50 text-sky-700 border-sky-100',              dot: 'bg-sky-500' },
  partial_refund: { pill: 'bg-orange-50 text-orange-600 border-orange-100',     dot: 'bg-orange-400' },
};

const METHOD_LABEL: Record<string, string> = {
  cash:           'Cash',
  bankak:         'Bankak',
  card:           'Card',
  bank_transfer:  'Bank Transfer',
  mobile_wallet:  'Mobile Wallet',
  loyalty_points: 'Points',
  split:          'Split',
  credit:         'Credit',
};

function fmt(v: number) {
  return v.toLocaleString('en', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ── Public wrapper ────────────────────────────────────────────────────────────

interface Props {
  sale:      Sale;
  canRefund: boolean;
  onClose:   () => void;
}

export default function SaleDrawer({ sale, canRefund, onClose }: Props) {
  const t = useTranslations('sales');
  return (
    <Drawer open onClose={onClose} title={t('drawer.title')} subtitle={sale.receipt_number}>
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
  const t      = useTranslations('sales');
  const router = useRouter();

  const [mode,  setMode]  = useState<Mode>('view');
  const [error, setError] = useState<string | null>(null);
  const [qtys,  setQtys]  = useState<QtyEntry[]>(() =>
    sale.items.map(item => ({
      product:      item.product,
      product_name: item.product_name,
      unit_price:   item.unit_price,
      max:          Math.round(parseFloat(item.quantity)),
      qty:          Math.round(parseFloat(item.quantity)),
    }))
  );

  const refundTotal   = qtys.reduce((s, e) => s + e.qty * parseFloat(e.unit_price), 0);
  const hasItems      = qtys.some(e => e.qty > 0);
  const isPending     = mode === 'pending';
  const isRefundMode  = mode === 'refund' || mode === 'pending';
  const canInitRefund = canRefund && (sale.status === 'completed' || sale.status === 'partial_refund');
  const statusCfg     = STATUS_CONFIG[sale.status] ?? { pill: 'bg-gray-50 text-gray-500 border-gray-100', dot: 'bg-gray-400' };

  function step(idx: number, delta: number) {
    setQtys(prev => prev.map((q, i) =>
      i === idx ? { ...q, qty: Math.min(q.max, Math.max(0, q.qty + delta)) } : q
    ));
  }

  function setDirect(idx: number, raw: string) {
    const v = Math.min(qtys[idx].max, Math.max(0, parseInt(raw, 10) || 0));
    setQtys(prev => prev.map((q, i) => i === idx ? { ...q, qty: v } : q));
  }

  async function handleConfirm() {
    const items = qtys.filter(e => e.qty > 0).map(e => ({ product: e.product, quantity: e.qty }));
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

  return (
    <div className="flex flex-col min-h-full">

      {/* ── Cashier + status ──────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-5">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar name={sale.cashier_name} size={40} />
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-text-primary leading-tight truncate">
                {sale.cashier_name}
              </p>
              <p className="text-[11px] text-text-hint mt-0.5">{t('drawer.cashier')}</p>
            </div>
          </div>
          <span
            className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${statusCfg.pill}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusCfg.dot}`} />
            {sale.status.replace('_', ' ')}
          </span>
        </div>
      </div>

      {/* ── Meta tiles ────────────────────────────────────────────────── */}
      <div className="px-5 pb-5 grid grid-cols-3 gap-2">
        {[
          { label: t('drawer.method'), value: METHOD_LABEL[sale.payment_method] ?? sale.payment_method },
          { label: t('columns.date'),  value: new Date(sale.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' }) },
          { label: 'Shop',             value: sale.shop_name },
        ].map(({ label, value }) => (
          <div key={label} className="bg-surface-soft rounded-xl px-3 py-3">
            <p className="text-[9px] font-black tracking-[.13em] uppercase text-text-hint mb-1.5">
              {label}
            </p>
            <p className="text-[12px] font-semibold text-text-primary leading-tight truncate">
              {value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Dashed tear line ──────────────────────────────────────────── */}
      <div className="mx-5 border-t border-dashed border-border-soft" />

      {/* ── Items ─────────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-3 flex-1">
        <p className="text-[9px] font-black tracking-[.16em] uppercase text-text-hint mb-4">
          {t('drawer.items')} · {sale.item_count}
        </p>

        {!isRefundMode ? (
          /* VIEW: receipt ledger */
          <div>
            {sale.items.map((item, idx) => (
              <div
                key={item.id}
                className={`py-3 flex items-start justify-between gap-4 ${
                  idx < sale.items.length - 1 ? 'border-b border-border-soft/50' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-text-primary truncate">{item.product_name}</p>
                  <p className="text-[11px] text-text-hint mt-1 font-mono tracking-tight">
                    {fmt(parseFloat(item.unit_price))} × {parseFloat(item.quantity).toFixed(0)}
                  </p>
                </div>
                <p className="text-[13px] font-bold text-text-primary tabular-nums font-mono shrink-0 pt-0.5">
                  {fmt(parseFloat(item.subtotal))}
                </p>
              </div>
            ))}
          </div>
        ) : (
          /* REFUND: stepper cards */
          <div className="space-y-2.5">
            {qtys.map((entry, idx) => {
              const excluded = entry.qty === 0;
              const lineTotal = entry.qty * parseFloat(entry.unit_price);
              return (
                <div
                  key={entry.product}
                  className={`rounded-2xl border transition-all duration-200 ${
                    excluded
                      ? 'border-border-soft/40 bg-surface-soft/40'
                      : 'border-border-soft bg-surface-soft'
                  } ${isPending ? 'opacity-60 pointer-events-none' : ''}`}
                >
                  <div className="px-4 py-3.5 flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`text-[13px] font-semibold leading-tight truncate transition-all duration-150 ${
                        excluded ? 'line-through text-text-hint' : 'text-text-primary'
                      }`}>
                        {entry.product_name}
                      </p>
                      <p className="text-[11px] text-text-hint mt-1 font-mono">
                        {fmt(parseFloat(entry.unit_price))} · max {entry.max}
                      </p>
                    </div>

                    {/* ±  stepper */}
                    <div className="shrink-0 flex items-center border border-border-soft rounded-xl overflow-hidden bg-white shadow-[0_1px_2px_0_rgb(0_0_0/.04)]">
                      <button
                        onClick={() => step(idx, -1)}
                        disabled={entry.qty === 0}
                        aria-label="decrease"
                        className="w-9 h-10 flex items-center justify-center text-[20px] font-light text-text-secondary hover:bg-surface-soft active:bg-surface-soft/80 disabled:opacity-25 transition-colors select-none"
                      >
                        −
                      </button>
                      <input
                        type="number"
                        dir="ltr"
                        min={0}
                        max={entry.max}
                        value={entry.qty}
                        onChange={e => setDirect(idx, e.target.value)}
                        className="w-10 h-10 text-center text-[14px] font-bold text-text-primary bg-transparent border-x border-border-soft focus:outline-none tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                      <button
                        onClick={() => step(idx, +1)}
                        disabled={entry.qty === entry.max}
                        aria-label="increase"
                        className="w-9 h-10 flex items-center justify-center text-[20px] font-light text-text-secondary hover:bg-surface-soft active:bg-surface-soft/80 disabled:opacity-25 transition-colors select-none"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* per-item subtotal when selected */}
                  {!excluded && (
                    <div className="px-4 pb-3 flex items-center justify-between border-t border-border-soft/40 pt-2.5">
                      <p className="text-[10px] text-text-hint">{t('drawer.subtotal')}</p>
                      <p className="text-[12px] font-bold text-text-primary tabular-nums font-mono">
                        {fmt(lineTotal)} SDG
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Dashed tear line ──────────────────────────────────────────── */}
      <div className="mx-5 border-t border-dashed border-border-soft" />

      {/* ── Total card ────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4">
        <div className={`rounded-2xl px-5 py-4 flex items-end justify-between transition-colors duration-200 ${
          isRefundMode ? 'bg-orange-50 border border-orange-100' : 'bg-surface-soft'
        }`}>
          <div>
            <p className="text-[10px] font-black tracking-[.14em] uppercase text-text-hint mb-1">
              {isRefundMode ? t('drawer.refundTotal') : t('columns.amount')}
            </p>
            {isRefundMode && (
              <p className="text-[11px] text-orange-400 font-mono">
                {qtys.filter(e => e.qty > 0).length} item{qtys.filter(e => e.qty > 0).length !== 1 ? 's' : ''}
              </p>
            )}
          </div>
          <div className="text-end">
            <p className={`text-[30px] font-black tabular-nums leading-none font-mono transition-colors duration-200 ${
              isRefundMode ? 'text-orange-600' : 'text-text-primary'
            }`}>
              {isRefundMode ? fmt(refundTotal) : fmt(parseFloat(sale.net_amount))}
            </p>
            <p className="text-[11px] text-text-hint mt-0.5">SDG</p>
          </div>
        </div>
      </div>

      {/* ── Error banner ──────────────────────────────────────────────── */}
      {error && (
        <div className="mx-5 mb-4 flex items-start gap-3 bg-red-50 border border-red-100 rounded-2xl px-4 py-3.5">
          <span className="text-red-400 text-[15px] leading-none shrink-0 mt-0.5">⚠</span>
          <p className="text-[12px] text-red-600 leading-snug">{error}</p>
        </div>
      )}

      {/* ── CTAs ──────────────────────────────────────────────────────── */}
      <div className="px-5 pb-6 space-y-2.5 mt-auto">
        {mode === 'view' && canInitRefund && (
          <button
            onClick={() => setMode('refund')}
            className="w-full bg-orange-500 hover:bg-orange-600 active:scale-[.98] text-white font-bold text-[14px] py-4 rounded-2xl transition-all duration-150 shadow-sm shadow-orange-200/60"
          >
            {t('drawer.refundBtn')}
          </button>
        )}

        {isRefundMode && (
          <>
            <button
              onClick={handleConfirm}
              disabled={!hasItems || isPending}
              className="w-full bg-red-500 hover:bg-red-600 active:scale-[.98] text-white font-bold text-[14px] py-4 rounded-2xl transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-sm shadow-red-200/60 flex items-center justify-center gap-2.5"
            >
              {isPending ? (
                <>
                  <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin shrink-0" />
                  Processing…
                </>
              ) : (
                `${t('drawer.confirmRefund')} · ${fmt(refundTotal)} SDG`
              )}
            </button>

            <button
              onClick={() => { setMode('view'); setError(null); }}
              disabled={isPending}
              className="w-full border border-border-soft text-text-secondary font-semibold text-[13px] py-3.5 rounded-2xl hover:bg-surface-soft transition-colors disabled:opacity-40"
            >
              {t('drawer.cancel')}
            </button>
          </>
        )}
      </div>

    </div>
  );
}
