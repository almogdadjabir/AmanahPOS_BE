'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Avatar from '@/components/ui/Avatar';
import SaleDrawer from './SaleDrawer';
import type { Sale } from '@/types/api';

// ── Constants (mirrors existing sales/page.tsx constants) ─────────────────────

const STATUS_STYLE: Record<string, string> = {
  completed:      'bg-success/10 text-success',
  pending:        'bg-warning/10 text-warning',
  cancelled:      'bg-danger/10 text-danger',
  refunded:       'bg-info/10 text-info',
  partial_refund: 'bg-orange-100 text-orange-600',
};

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', bankak: 'Bankak', card: 'Card',
  bank_transfer: 'Bank', mobile_wallet: 'Mobile',
  loyalty_points: 'Points', split: 'Split', credit: 'Credit',
};

const METHOD_TEXT: Record<string, string> = {
  cash:           'text-info',
  bankak:         'text-success',
  card:           'text-primary',
  bank_transfer:  'text-warning',
  mobile_wallet:  'text-purple-600',
  loyalty_points: 'text-orange-500',
  split:          'text-slate-500',
  credit:         'text-rose-500',
};

const METHOD_COLOR: Record<string, string> = {
  cash:           'bg-info/80',
  bankak:         'bg-success/80',
  card:           'bg-primary/80',
  bank_transfer:  'bg-warning/80',
  mobile_wallet:  'bg-purple-500/80',
  loyalty_points: 'bg-orange-400/80',
  split:          'bg-slate-400/80',
  credit:         'bg-rose-400/80',
};

function fmtMoney(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  sales:     Sale[];
  canRefund: boolean;
}

export default function SalesTableClient({ sales, canRefund }: Props) {
  const t = useTranslations('sales');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);

  return (
    <>
      {selectedSale && (
        <SaleDrawer
          sale={selectedSale}
          canRefund={canRefund}
          onClose={() => setSelectedSale(null)}
        />
      )}

      <div className="bg-white rounded-2xl border border-border-soft shadow-[0_1px_4px_0_rgb(0_0_0/.05)] overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border-soft">
          <p className="text-[13px] font-bold text-text-primary">{t('recentTitle')}</p>
          <span className="text-[11px] text-text-hint">
            {sales.length} {t('noData')}
          </span>
        </div>

        {sales.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[13px] text-text-hint">{t('noTransactions')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-soft">
                  {[
                    t('columns.receipt'),
                    t('columns.cashier'),
                    t('columns.method'),
                    t('columns.status'),
                    t('columns.items'),
                    t('columns.amount'),
                    t('columns.date'),
                  ].map(h => (
                    <th
                      key={h}
                      className="text-start px-4 py-2.5 text-[10px] font-black tracking-[.14em] uppercase text-text-hint last:text-end whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sales.map(sale => {
                  const date = new Date(sale.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                  });
                  return (
                    <tr
                      key={sale.id}
                      onClick={() => setSelectedSale(sale)}
                      className="border-b border-border-soft/60 hover:bg-surface-soft transition-colors last:border-0 cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono text-[11px] text-text-hint whitespace-nowrap">
                        {sale.receipt_number}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={sale.cashier_name} size={22} />
                          <span className="text-[12px] text-text-primary whitespace-nowrap">
                            {sale.cashier_name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold ${METHOD_TEXT[sale.payment_method] ?? 'text-text-secondary'}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${METHOD_COLOR[sale.payment_method] ?? 'bg-slate-300'}`} />
                          {METHOD_LABEL[sale.payment_method] ?? sale.payment_method}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[sale.status] ?? 'bg-surface-muted text-text-hint'}`}>
                          {sale.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-text-secondary">
                        {sale.item_count}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-[13px] font-bold text-text-primary tabular-nums">
                          {fmtMoney(parseFloat(sale.net_amount))}
                          <span className="text-[10px] font-normal text-text-hint ms-1">SDG</span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-text-hint text-end whitespace-nowrap">
                        {date}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
