import { fetchAdminSubscriptions } from '@/services/admin';
import { ApiError } from '@/lib/api';
import type { AdminSubscription } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/ds/EmptyState';
import Pagination from '@/components/ds/Pagination';
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from '@/components/ui/table';
import ViewSubscriptionButton from './ViewSubscriptionButton';
import { CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  search?: string;
  status?: string;
  page?:   number;
}

export default async function SubscriptionsTable({ search, status, page = 1 }: Props) {
  let data;
  try {
    const s = (status === 'active' || status === 'expired') ? status : 'all';
    data = await fetchAdminSubscriptions({
      search:   search || undefined,
      status:   s,
      ordering: '-created_at',
      page,
      page_size: 20,
    });
  } catch (err) {
    const httpStatus = err instanceof ApiError ? err.status : null;
    const body       = err instanceof ApiError ? JSON.stringify(err.body) : String(err);
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-10 text-center">
        <p className="text-sm font-semibold text-destructive">Failed to load subscriptions</p>
        <p className="text-xs text-destructive/70 mt-1">
          {httpStatus ? `HTTP ${httpStatus}` : 'Network error'} — check server logs for details.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-3 text-left text-[10px] bg-destructive/10 rounded p-2 overflow-x-auto text-destructive/80 max-h-32">
            {body}
          </pre>
        )}
      </div>
    );
  }

  if (data.results.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
        <EmptyState
          icon={<CreditCard />}
          title={search ? 'No subscriptions match your search' : 'No subscriptions yet'}
          description={
            search
              ? 'Try different keywords or clear the search.'
              : 'Create the first subscription to get started.'
          }
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      {/* Count bar */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
        <span className="w-5 h-5 rounded-md bg-warning/10 text-warning flex items-center justify-center [&_svg]:size-3">
          <CreditCard />
        </span>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
          {data.count.toLocaleString()} subscription{data.count !== 1 ? 's' : ''}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border/60">
            {['Business', 'Owner', 'Plan', 'Period', 'Status', 'Days Left', ''].map((h, i) => (
              <TableHead key={i}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.results.map(sub => (
            <SubscriptionRow key={sub.id} sub={sub} />
          ))}
        </TableBody>
      </Table>

      <Pagination count={data.count} pageSize={20} />
    </div>
  );
}

function SubscriptionRow({ sub }: { sub: AdminSubscription }) {
  const startDate = new Date(sub.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endDate   = new Date(sub.end_date).toLocaleDateString('en-US',   { month: 'short', day: 'numeric', year: 'numeric' });

  const price = parseFloat(sub.plan_price);
  const isDemo = price === 0;

  const statusVariant = sub.is_expired ? 'danger' : sub.is_active ? 'success' : 'warning';
  const statusLabel   = sub.is_expired ? 'Expired'  : sub.is_active ? 'Active'   : 'Inactive';

  return (
    <TableRow className="group hover:bg-muted/40 transition-colors">
      {/* Business */}
      <TableCell>
        <div className="flex items-center gap-2">
          <div className={cn(
            'w-7 h-7 rounded-lg flex items-center justify-center shrink-0',
            sub.is_expired ? 'bg-muted' : 'bg-warning/10',
          )}>
            <span className={cn(
              'text-[12px] font-black uppercase',
              sub.is_expired ? 'text-muted-foreground' : 'text-warning',
            )}>
              {sub.business_name.charAt(0)}
            </span>
          </div>
          <p className="text-[13px] font-semibold text-foreground truncate max-w-[140px]">
            {sub.business_name}
          </p>
        </div>
      </TableCell>

      {/* Owner */}
      <TableCell>
        <p className="text-[13px] font-medium text-foreground leading-tight">
          {sub.owner_name || <span className="text-muted-foreground italic text-xs">No name</span>}
        </p>
        <span className="inline-flex items-center px-1.5 py-0.5 mt-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground">
          {sub.owner_phone}
        </span>
      </TableCell>

      {/* Plan */}
      <TableCell>
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-[13px] font-semibold text-foreground">{sub.plan_name}</p>
          {isDemo && <Badge variant="info" className="text-[9px] py-0">Demo</Badge>}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {isDemo ? 'Free access' : `${price.toFixed(2)} ${sub.plan_currency}`}
        </p>
      </TableCell>

      {/* Period */}
      <TableCell>
        <p className="text-[12px] text-muted-foreground whitespace-nowrap">
          {startDate} → {endDate}
        </p>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge dot variant={statusVariant}>{statusLabel}</Badge>
      </TableCell>

      {/* Days left */}
      <TableCell>
        <span className={cn(
          'text-[13px] font-bold',
          sub.is_expired
            ? 'text-destructive'
            : sub.days_remaining <= 7
            ? 'text-warning'
            : 'text-success',
        )}>
          {sub.is_expired ? '0' : sub.days_remaining}d
        </span>
      </TableCell>

      {/* Action */}
      <TableCell className="text-end">
        <ViewSubscriptionButton subscriptionId={sub.id} />
      </TableCell>
    </TableRow>
  );
}
