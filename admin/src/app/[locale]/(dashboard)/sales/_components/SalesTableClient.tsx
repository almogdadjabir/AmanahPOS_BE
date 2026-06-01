'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Avatar from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/badge';
import SaleDrawer from './SaleDrawer';
import type { Sale } from '@/types/api';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { cn } from '@/lib/utils';

// ── S6: Status badge config — system badge pattern, dot, Title Case ───────────
// completed/pending use success/warning; refunded/cancelled use danger; partial = warning (never red)

type BadgeVariant = 'success' | 'warning' | 'danger' | 'default';

const STATUS_BADGE: Record<string, { variant: BadgeVariant; label: string }> = {
  completed:      { variant: 'success', label: 'Completed' },
  pending:        { variant: 'warning', label: 'Pending' },
  cancelled:      { variant: 'danger',  label: 'Cancelled' },
  refunded:       { variant: 'danger',  label: 'Refunded' },
  partial_refund: { variant: 'warning', label: 'Partial Refund' },
};

// ── S1: Method colors — no blue, slate for cash ───────────────────────────────

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', bankak: 'Bankak', card: 'Card',
  bank_transfer: 'Bank', mobile_wallet: 'Mobile',
  loyalty_points: 'Points', split: 'Split', credit: 'Credit',
};

// dot class for the 6px indicator
const METHOD_DOT: Record<string, string> = {
  cash:           'bg-[#94A1B2]',            // slate-dot — no blue
  bankak:         'bg-primary',              // teal
  card:           'bg-muted-foreground/60',
  bank_transfer:  'bg-warning/80',
  mobile_wallet:  'bg-muted-foreground/50',
  loyalty_points: 'bg-warning/70',
  split:          'bg-muted-foreground/40',
  credit:         'bg-danger/70',
};

// text class for the method label
const METHOD_TEXT: Record<string, string> = {
  cash:           'text-[#536074]',          // slate
  bankak:         'text-primary',            // teal
  card:           'text-muted-foreground',
  bank_transfer:  'text-warning',
  mobile_wallet:  'text-muted-foreground',
  loyalty_points: 'text-warning',
  split:          'text-muted-foreground',
  credit:         'text-danger',
};

// ── S4: Full tabular figures — no K abbreviation ──────────────────────────────

function fmtMoney(v: number) {
  return new Intl.NumberFormat('en-US').format(Math.round(v));
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

      <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <p className="text-[13px] font-semibold text-foreground">{t('recentTitle')}</p>
          <span className="text-[11px] text-muted-foreground">
            {sales.length} {sales.length === 1 ? t('sale') : t('sales')}
          </span>
        </div>

        {sales.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-[13px] text-muted-foreground">{t('noTransactions')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table className="w-full">
              <TableHeader>
                {/* Fix #18: use TableHead's built-in style */}
                <TableRow className="border-b border-border">
                  {[
                    t('columns.receipt'), t('columns.cashier'), t('columns.method'),
                    t('columns.status'), t('columns.items'), t('columns.amount'), t('columns.date'),
                  ].map((h, i) => (
                    <TableHead key={h} className={i >= 4 ? 'text-end' : ''}>{h}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sales.map(sale => {
                  const date = new Date(sale.created_at).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric',
                  });
                  const status = STATUS_BADGE[sale.status] ?? { variant: 'default' as BadgeVariant, label: sale.status };

                  return (
                    <TableRow
                      key={sale.id}
                      onClick={() => setSelectedSale(sale)}
                      className="border-b border-border/60 hover:bg-muted/40 transition-colors last:border-0 cursor-pointer"
                    >
                      <TableCell className="px-4 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                        {sale.receipt_number}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar name={sale.cashier_name} size={22} />
                          <span className="text-[12px] text-foreground whitespace-nowrap">
                            {sale.cashier_name}
                          </span>
                        </div>
                      </TableCell>
                      {/* S1: method — slate dot for cash, teal for bankak */}
                      <TableCell className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 text-[12px] font-medium',
                          METHOD_TEXT[sale.payment_method] ?? 'text-muted-foreground',
                        )}>
                          <span className={cn(
                            'w-1.5 h-1.5 rounded-full shrink-0',
                            METHOD_DOT[sale.payment_method] ?? 'bg-muted-foreground/50',
                          )} />
                          {METHOD_LABEL[sale.payment_method] ?? sale.payment_method}
                        </span>
                      </TableCell>
                      {/* S6: system badge — dot, rounded-full, Title Case */}
                      <TableCell className="px-4 py-3">
                        <Badge dot variant={status.variant}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-[12px] text-muted-foreground text-end">
                        {sale.item_count}
                      </TableCell>
                      {/* S4: full grouped numbers */}
                      <TableCell className="px-4 py-3 text-end">
                        <span className="text-[13px] font-semibold text-foreground tabular-nums num">
                          {fmtMoney(parseFloat(sale.net_amount))}
                          <span className="text-[10px] font-normal text-muted-foreground ms-1">SDG</span>
                        </span>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-[11px] text-muted-foreground text-end whitespace-nowrap">
                        {date}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </>
  );
}
