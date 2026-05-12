'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { cn } from '@/lib/utils';
import { fetchAdminDeliveryLogs } from '../../actions';
import type { DeliveryLog } from '@/types/api';

const STATUS_STYLES: Record<string, string> = {
  sent:       'bg-green-100 text-green-700',
  failed:     'bg-red-100 text-red-700',
  pending:    'bg-yellow-100 text-yellow-700',
  processing: 'bg-blue-100 text-blue-700',
  cancelled:  'bg-muted text-muted-foreground',
};

const CHANNEL_STYLES: Record<string, string> = {
  push:  'bg-blue-100 text-blue-700',
  sms:   'bg-violet-100 text-violet-700',
  email: 'bg-orange-100 text-orange-700',
};

type Filters = { channel: string; status: string; search: string };

export default function LogsTable() {
  const t = useTranslations('notifications');

  const [logs,    setLogs]    = useState<DeliveryLog[]>([]);
  const [count,   setCount]   = useState(0);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<Filters>({ channel: '', status: '', search: '' });

  async function load() {
    setLoading(true);
    try {
      const res = await fetchAdminDeliveryLogs({ ...filters, page, page_size: 20 });
      setLogs(res.results);
      setCount(res.count);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [filters, page]); // eslint-disable-line react-hooks/exhaustive-deps

  function setFilter(key: keyof Filters, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(1);
  }

  function statusLabel(status: string) {
    const map: Record<string, string> = {
      sent: t('statusSent'), failed: t('statusFailed'), pending: t('statusPending'),
      processing: t('statusProcessing'), cancelled: t('statusCancelled'),
    };
    return map[status] ?? status;
  }

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <select
          value={filters.channel}
          onChange={(e) => setFilter('channel', e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">{t('filterChannel')}: All</option>
          <option value="push">{t('channelPush')}</option>
          <option value="sms">{t('channelSms')}</option>
          <option value="email">{t('channelEmail')}</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilter('status', e.target.value)}
          className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">{t('filterStatus')}: All</option>
          <option value="sent">{t('statusSent')}</option>
          <option value="failed">{t('statusFailed')}</option>
          <option value="pending">{t('statusPending')}</option>
          <option value="processing">{t('statusProcessing')}</option>
          <option value="cancelled">{t('statusCancelled')}</option>
        </select>

        <input
          type="search"
          value={filters.search}
          onChange={(e) => setFilter('search', e.target.value)}
          placeholder="Search name / phone…"
          className="px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary w-full sm:w-56"
        />
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('logRecipient')}</th>
                <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">{t('logMessage')}</th>
                <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('logChannel')}</th>
                <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('logStatus')}</th>
                <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">{t('logSentBy')}</th>
                <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden xl:table-cell">{t('logSentAt')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading && (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Loading…</td></tr>
              )}
              {!loading && logs.length === 0 && (
                <tr><td colSpan={6} className="text-center py-12 text-muted-foreground">{t('noLogs')}</td></tr>
              )}
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-foreground">{log.recipient_name}</p>
                    <p className="text-xs text-muted-foreground">{log.recipient_phone}</p>
                  </td>
                  <td className="px-4 py-3 max-w-[260px] hidden md:table-cell">
                    <p className="truncate text-muted-foreground text-xs">{log.notification_title}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide', CHANNEL_STYLES[log.channel] ?? 'bg-muted text-muted-foreground')}>
                      {log.channel}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide', STATUS_STYLES[log.status] ?? 'bg-muted text-muted-foreground')}>
                      {statusLabel(log.status)}
                    </span>
                    {log.retry_count > 0 && (
                      <span className="ms-1.5 text-[10px] text-muted-foreground">×{log.retry_count}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden lg:table-cell">
                    {log.sent_by_admin_name ?? 'System'}
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground hidden xl:table-cell">
                    {log.sent_at ? new Date(log.sent_at).toLocaleString() : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {count > 20 && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>{count} total</span>
          <div className="flex gap-2">
            <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded-lg border border-border disabled:opacity-40 hover:bg-muted">Prev</button>
            <button disabled={page * 20 >= count} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded-lg border border-border disabled:opacity-40 hover:bg-muted">Next</button>
          </div>
        </div>
      )}
    </div>
  );
}
