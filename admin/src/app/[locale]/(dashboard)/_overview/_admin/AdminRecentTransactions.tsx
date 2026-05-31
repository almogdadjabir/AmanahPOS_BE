import { Receipt } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import Avatar from '@/components/ui/Avatar';
import type { AdminRecentTransaction } from '@/types/api';
import type { AdminStats } from './types';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

const METHOD_LABEL: Record<string, string> = {
  cash: 'Cash', bankak: 'Bankak', card: 'Card',
  bank_transfer: 'Bank', mobile_wallet: 'Mobile',
  loyalty_points: 'Points', split: 'Split', credit: 'Credit',
};
const METHOD_COLOR: Record<string, string> = {
  cash: 'bg-info/15 text-info',           bankak: 'bg-success/15 text-success',
  card: 'bg-primary/15 text-primary',     bank_transfer: 'bg-warning/15 text-warning',
  mobile_wallet: 'bg-purple-100 text-purple-600',
  loyalty_points: 'bg-orange-100 text-orange-600',
  split: 'bg-slate-100 text-slate-600',   credit: 'bg-rose-100 text-rose-600',
};
const STATUS_COLOR: Record<string, string> = {
  completed:      'text-success',
  pending:        'text-warning',
  cancelled:      'text-danger',
  refunded:       'text-info',
  partial_refund: 'text-orange-500',
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
    <div className="bg-card rounded-xl border border-border shadow-[0_1px_4px_0_rgb(0_0_0/.05)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center [&_svg]:size-3.5 text-muted-foreground">
            <Receipt />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">{t('recentTxns.title')}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('recentTxns.sub')}</p>
          </div>
        </div>
        {txs.length > 0 && (
          <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
            {txs.length} {t('recentTxns.shown')}
          </span>
        )}
      </div>

      {txs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center px-6">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
            <Receipt className="size-4 text-muted-foreground" />
          </div>
          <p className="text-[13px] font-semibold text-foreground">{t('recentTxns.empty.title')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('recentTxns.empty.desc')}</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="border-b border-border/60">
                {headers.map(h => (
                  <TableHead
                    key={h}
                    className="text-start px-4 py-2.5 text-[10px] font-black tracking-[.14em] uppercase text-muted-foreground last:text-end whitespace-nowrap"
                  >
                    {h}
                  </TableHead>
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
    <TableRow className="border-b border-border/40 last:border-0 hover:bg-muted/40 transition-colors">
      <TableCell className="px-4 py-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
        {tx.receipt_number}
      </TableCell>
      <TableCell className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Avatar name={tx.business_name} size={22} />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-foreground truncate leading-tight">
              {tx.business_name}
            </p>
            <p className="text-[10px] text-muted-foreground truncate">{tx.shop_name}</p>
          </div>
        </div>
      </TableCell>
      <TableCell className="px-4 py-3">
        <span className="text-[12px] text-foreground">{tx.cashier_name}</span>
      </TableCell>
      <TableCell className="px-4 py-3">
        <span className={`inline-flex items-center gap-1 px-2 py-[3px] rounded-full text-[10px] font-bold ${
          METHOD_COLOR[tx.payment_method] ?? 'bg-muted text-muted-foreground'
        }`}>
          {METHOD_LABEL[tx.payment_method] ?? tx.payment_method}
        </span>
      </TableCell>
      <TableCell className="px-4 py-3">
        <span className="text-[13px] font-bold text-foreground tabular-nums">
          {amount}
          <span className="text-[10px] font-normal text-muted-foreground ml-1">SDG</span>
        </span>
      </TableCell>
      <TableCell className="px-4 py-3 text-[11px] text-muted-foreground text-end whitespace-nowrap">
        <span className={`text-[10px] font-semibold mr-2 ${STATUS_COLOR[tx.status] ?? ''}`}>
          {tx.status}
        </span>
        {time}
      </TableCell>
    </TableRow>
  );
}
