import { Receipt } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Avatar from '@/components/ui/Avatar';
import type { AdminRecentTransaction } from '@/types/api';
import type { AdminStats } from './types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

// Fix #6: no blue, no purple, no rose — neutral/teal/amber/success set only
const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', bankak: 'Bankak', card: 'Card',
  bank_transfer: 'Bank', mobile_wallet: 'Mobile',
  loyalty_points: 'Points', split: 'Split', credit: 'Credit',
};
const METHOD_COLOR: Record<string, string> = {
  cash:           'bg-muted text-muted-foreground',
  bankak:         'bg-success-light text-success',
  card:           'bg-primary-tint text-primary-700',
  bank_transfer:  'bg-warning-light text-warning',
  mobile_wallet:  'bg-muted text-muted-foreground',
  loyalty_points: 'bg-muted text-muted-foreground',
  split:          'bg-muted text-muted-foreground',
  credit:         'bg-warning-light text-warning',
};
const STATUS_COLOR: Record<string, string> = {
  completed:      'text-success',
  pending:        'text-warning',
  cancelled:      'text-danger',
  refunded:       'text-danger',
  partial_refund: 'text-warning',
};

function fmtMoney(v: number) {
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
  return v.toFixed(0);
}

type Props = { stats: AdminStats };

export default async function AdminRecentTransactions({ stats }: Props) {
  const t = await getTranslations('dashboard');
  const txs = stats?.recent_transactions ?? [];
  const headers = [
    t('recentTxns.receipt'), t('recentTxns.business'), t('recentTxns.cashier'),
    t('recentTxns.method'), t('recentTxns.amount'), t('recentTxns.time'),
  ];

  return (
    <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
      {/* Fix #8: 32px rounded-[9px] neutral chip */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="w-[32px] h-[32px] rounded-[9px] bg-muted flex items-center justify-center [&_svg]:size-[15px] text-muted-foreground shrink-0">
            <Receipt />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground tracking-[-.015em] leading-tight">{t('recentTxns.title')}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('recentTxns.sub')}</p>
          </div>
        </div>
        {txs.length > 0 && (
          <span className="text-[11px] font-medium text-muted-foreground tabular-nums">
            {txs.length} {t('recentTxns.shown')}
          </span>
        )}
      </div>

      {txs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
          <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center mb-3">
            <Receipt className="size-4 text-muted-foreground" />
          </div>
          <p className="text-[13px] font-semibold text-foreground">{t('recentTxns.empty.title')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('recentTxns.empty.desc')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              {/* Fix #18: use the table component's default thead style (bg-muted/60, 10.5px semibold) */}
              <TableRow>
                {headers.map(h => (
                  <TableHead key={h}>{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {txs.map(tx => (
                <TxRow key={tx.id} tx={tx} />
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

function TxRow({ tx }: { tx: AdminRecentTransaction }) {
  const time = new Date(tx.created_at).toLocaleTimeString('en-US', {
    hour: '2-digit', minute: '2-digit', month: 'short', day: 'numeric',
  });
  const amount = fmtMoney(parseFloat(tx.net_amount));

  return (
    <TableRow>
      {/* Fix #18: receipt IDs font-mono */}
      <TableCell className="font-mono text-[11.5px]">
        {tx.receipt_number}
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <Avatar name={tx.business_name} size={22} />
          <div className="min-w-0">
            <p className="text-[12px] font-medium text-foreground truncate leading-tight">
              {tx.business_name}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{tx.shop_name}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-[12px] text-muted-foreground">{tx.cashier_name}</span>
      </TableCell>
      <TableCell>
        <span className={`inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10.5px] font-medium ${
          METHOD_COLOR[tx.payment_method] ?? 'bg-muted text-muted-foreground'
        }`}>
          {METHOD_LABEL[tx.payment_method] ?? tx.payment_method}
        </span>
      </TableCell>
      {/* Fix #18: amount right-aligned, tabular, font-semibold text-foreground */}
      <TableCell className="text-end">
        <span className="text-[13px] font-semibold text-foreground tabular-nums num">
          {amount}
        </span>
        <span className="text-[10px] font-normal text-muted-foreground ms-1">SDG</span>
      </TableCell>
      <TableCell className="text-end whitespace-nowrap">
        <span className={`text-[10px] font-semibold me-2 ${STATUS_COLOR[tx.status] ?? ''}`}>
          {tx.status}
        </span>
        <span className="text-[11px] text-muted-foreground">{time}</span>
      </TableCell>
    </TableRow>
  );
}
