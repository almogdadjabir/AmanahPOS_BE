import { Warehouse } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/ds/EmptyState';
import Pagination from '@/components/ds/Pagination';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
} from '@/components/ui/table';
import { fetchStockLevelsAction } from '@/actions/inventory';
import InventoryRowActions from './InventoryRowActions';
import type { StockLevel } from '@/types/api';

interface Props {
  search?: string;
  status?: string;
  page?:   number;
}

export default async function InventoryTable({ search, status, page = 1 }: Props) {
  const t = await getTranslations('inventory');
  let result;
  try {
    result = await fetchStockLevelsAction({
      search: search || undefined,
      status: (status === 'low_stock' || status === 'out_of_stock') ? status : undefined,
      page,
      limit: 25,
    });
  } catch {
    return <TableError message={t('error.failedToLoad')} />;
  }

  if (!result.ok) return <TableError message={result.error} />;

  const { data: items, count } = result;

  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
        <EmptyState
          icon={<Warehouse />}
          title={search ? t('empty.titleSearch') : t('empty.title')}
          description={search ? t('empty.descSearch') : t('empty.desc')}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
        <span className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center [&_svg]:size-3">
          <Warehouse />
        </span>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
          {count.toLocaleString()} item{count !== 1 ? 's' : ''}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border/60">
            <TableHead className="w-[35%]">{t('columns.product')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('columns.shop')}</TableHead>
            <TableHead className="hidden sm:table-cell">{t('columns.sku')}</TableHead>
            <TableHead>{t('columns.qty')}</TableHead>
            <TableHead className="hidden sm:table-cell">{t('columns.status')}</TableHead>
            <TableHead className="hidden lg:table-cell">{t('columns.updated')}</TableHead>
            <TableHead className="w-[160px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map(item => <InventoryRow key={item.id} item={item} />)}
        </TableBody>
      </Table>

      <Pagination count={count} pageSize={25} />
    </div>
  );
}

async function InventoryRow({ item }: { item: StockLevel }) {
  const t = await getTranslations('inventory');
  const qty     = Number(item.quantity);
  const updated = new Date(item.updated_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const statusVariant = item.is_out_of_stock ? 'danger' : item.is_low_stock ? 'warning' : 'success';
  const statusLabel   = item.is_out_of_stock ? t('statusOutOfStock') : item.is_low_stock ? t('statusLowStock') : t('statusInStock');

  return (
    <TableRow className="group hover:bg-muted/40 transition-colors">
      <TableCell>
        <p className="text-[13px] font-semibold text-foreground leading-tight">{item.product_name}</p>
      </TableCell>

      <TableCell className="hidden md:table-cell">
        <span className="text-[13px] text-muted-foreground">{item.shop_name}</span>
      </TableCell>

      <TableCell className="hidden sm:table-cell">
        {item.product_sku ? (
          <span className="font-mono text-[11px] text-muted-foreground">{item.product_sku}</span>
        ) : (
          <span className="text-[11px] text-muted-foreground/40 italic">—</span>
        )}
      </TableCell>

      <TableCell>
        <span className="text-[13px] font-bold tabular-nums text-foreground">{qty}</span>
      </TableCell>

      <TableCell className="hidden sm:table-cell">
        <Badge dot variant={statusVariant}>{statusLabel}</Badge>
      </TableCell>

      <TableCell className="hidden lg:table-cell">
        <span className="text-xs text-muted-foreground">{updated}</span>
      </TableCell>

      <TableCell>
        <InventoryRowActions item={item} />
      </TableCell>
    </TableRow>
  );
}

function TableError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-10 text-center">
      <p className="text-sm font-semibold text-destructive">{message}</p>
    </div>
  );
}
