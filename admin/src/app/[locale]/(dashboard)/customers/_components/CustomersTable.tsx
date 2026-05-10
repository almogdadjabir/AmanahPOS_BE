import { Users } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/ds/EmptyState';
import Pagination from '@/components/ds/Pagination';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
} from '@/components/ui/table';
import { fetchCustomersAction } from '@/actions/customers';
import CustomerRowActions from './CustomerRowActions';
import type { Customer } from '@/types/api';

interface Props {
  search?: string;
  status?: string;
  page?:   number;
}

export default async function CustomersTable({ search, status, page = 1 }: Props) {
  const t = await getTranslations('customers');
  let result;
  try {
    result = await fetchCustomersAction({
      search: search || undefined,
      status: (status === 'active' || status === 'inactive') ? status : undefined,
      page,
      limit: 25,
    });
  } catch {
    return <TableError message={t('error.failedToLoad')} />;
  }

  if (!result.ok) return <TableError message={result.error} />;

  const { data: customers, count } = result;

  if (customers.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
        <EmptyState
          icon={<Users />}
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
          <Users />
        </span>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
          {count.toLocaleString()} customer{count !== 1 ? 's' : ''}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border/60">
            <TableHead className="w-[30%]">{t('columns.name')}</TableHead>
            <TableHead>{t('columns.phone')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('columns.email')}</TableHead>
            <TableHead className="hidden sm:table-cell">{t('columns.loyalty')}</TableHead>
            <TableHead className="hidden lg:table-cell">{t('columns.purchases')}</TableHead>
            <TableHead className="hidden md:table-cell">{t('columns.status')}</TableHead>
            <TableHead className="w-[180px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map(c => <CustomerRow key={c.id} customer={c} />)}
        </TableBody>
      </Table>

      <Pagination count={count} pageSize={25} />
    </div>
  );
}

async function CustomerRow({ customer }: { customer: Customer }) {
  const t = await getTranslations('customers');
  const purchases = parseFloat(customer.total_purchases || '0');

  return (
    <TableRow className="group hover:bg-muted/40 transition-colors">
      <TableCell>
        <p className="text-[13px] font-semibold text-foreground leading-tight">{customer.name}</p>
        {customer.address && (
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[200px]">
            {customer.address}
          </p>
        )}
      </TableCell>

      <TableCell>
        <span className="font-mono text-[12px] text-muted-foreground">
          {customer.phone || '—'}
        </span>
      </TableCell>

      <TableCell className="hidden md:table-cell">
        <span className="text-[12px] text-muted-foreground truncate max-w-[160px] block">
          {customer.email || '—'}
        </span>
      </TableCell>

      <TableCell className="hidden sm:table-cell">
        <span className="text-[13px] font-bold tabular-nums text-foreground">
          {customer.loyalty_points.toLocaleString()}
        </span>
      </TableCell>

      <TableCell className="hidden lg:table-cell">
        <span className="text-[13px] font-semibold tabular-nums text-foreground">
          SDG {purchases.toLocaleString(undefined, { maximumFractionDigits: 0 })}
        </span>
      </TableCell>

      <TableCell className="hidden md:table-cell">
        <Badge dot variant={customer.is_active ? 'success' : 'danger'}>
          {customer.is_active ? t('active') : t('inactive')}
        </Badge>
      </TableCell>

      <TableCell>
        <CustomerRowActions customer={customer} />
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
