import { getTranslations } from 'next-intl/server';
import { Bell } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchAdminDeliveryLogs } from '../actions';
import EmptyState from '@/components/ds/EmptyState';
import Pagination from '@/components/ds/Pagination';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
} from '@/components/ui/table';

interface Props {
  search?:  string;
  channel?: string;
  status?:  string;
  page?:    number;
}

const STATUS_STYLES: Record<string, string> = {
  sent:       'bg-success/10 text-success border-success/20',
  failed:     'bg-destructive/10 text-destructive border-destructive/20',
  pending:    'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  processing: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  cancelled:  'bg-muted text-muted-foreground border-border',
};

const CHANNEL_STYLES: Record<string, string> = {
  push:  'bg-primary/10 text-primary border-primary/20',
  sms:   'bg-violet-500/10 text-violet-600 border-violet-500/20',
  email: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
};

export default async function NotificationsLogsTable({ search, channel, status, page = 1 }: Props) {
  const t = await getTranslations('notifications');

  let data;
  try {
    data = await fetchAdminDeliveryLogs({
      search:  search  || undefined,
      channel: channel || undefined,
      status:  status  || undefined,
      page,
      page_size: 20,
    });
  } catch {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-10 text-center">
        <p className="text-sm font-semibold text-destructive">{t('logsDescription')}</p>
      </div>
    );
  }

  if (data.results.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
        <EmptyState icon={<Bell />} title={t('noLogs')} description={t('logsDescription')} />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
        <span className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center [&_svg]:size-3">
          <Bell />
        </span>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
          {data.count.toLocaleString()} {t('title').toLowerCase()}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border/60">
            {[t('logRecipient'), t('logMessage'), t('logChannel'), t('logStatus'), t('logSentBy'), t('logSentAt')].map((h, i) => (
              <TableHead key={i}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.results.map((log) => {
            const sentAt = log.sent_at
              ? new Date(log.sent_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
              : null;
            return (
              <TableRow key={log.id}>
                <TableCell>
                  <p className="text-[13px] font-semibold text-foreground leading-tight">{log.recipient_name}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">{log.recipient_phone}</p>
                </TableCell>
                <TableCell className="max-w-[200px]">
                  <p className="text-xs text-muted-foreground truncate">{log.notification_title || '—'}</p>
                </TableCell>
                <TableCell>
                  <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border',
                    CHANNEL_STYLES[log.channel] ?? 'bg-muted text-muted-foreground border-border')}>
                    {log.channel}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border',
                      STATUS_STYLES[log.status] ?? 'bg-muted text-muted-foreground border-border')}>
                      {log.status}
                    </span>
                    {log.retry_count > 0 && (
                      <span className="text-[10px] text-muted-foreground">×{log.retry_count}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground">{log.sent_by_admin_name ?? 'System'}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">{sentAt ?? '—'}</span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Pagination count={data.count} pageSize={20} />
    </div>
  );
}
