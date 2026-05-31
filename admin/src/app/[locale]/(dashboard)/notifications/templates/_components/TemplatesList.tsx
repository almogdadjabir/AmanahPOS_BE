'use client';

import { useState, useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Edit2, Trash2, ToggleLeft, ToggleRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  deleteAdminTemplate,
  fetchAdminTemplates,
  toggleAdminTemplate,
} from '../../actions';
import type { NotificationTemplate } from '@/types/api';

const CHANNEL_COLORS: Record<string, string> = {
  push: 'bg-blue-100 text-blue-700',
  sms:  'bg-violet-100 text-violet-700',
  both: 'bg-emerald-100 text-emerald-700',
};

export default function TemplatesList() {
  const t  = useTranslations('notifications');
  const tc = useTranslations('common');
  const router = useRouter();
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [count, setCount]         = useState(0);
  const [search, setSearch]       = useState('');
  const [page, setPage]           = useState(1);
  const [loading, setLoading]     = useState(true);
  const [, startTransition]       = useTransition();

  async function load() {
    setLoading(true);
    try {
      const res = await fetchAdminTemplates({ search, page, page_size: 20 });
      setTemplates(res.results);
      setCount(res.count);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [search, page]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleToggle(id: string) {
    const updated = await toggleAdminTemplate(id);
    setTemplates((prev) =>
      prev.map((tmpl) => (tmpl.id === id ? { ...tmpl, is_enabled: updated.is_enabled } : tmpl)),
    );
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`${t('confirmDelete')}\n"${name}"`)) return;
    await deleteAdminTemplate(id);
    startTransition(() => { load(); });
  }

  return (
    <div>
      {/* Search */}
      <input
        type="search"
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder={`${t('templateName')} / ${t('templateKey')}…`}
        className="mb-4 w-full sm:w-80 px-3 py-2 text-sm border border-border rounded-lg bg-background placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
      />

      {/* Table */}
      <div className="rounded-xl border border-border overflow-hidden bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('templateName')}</th>
              <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden md:table-cell">{t('templateKey')}</th>
              <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">{t('templateChannel')}</th>
              <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">{t('templateCategory')}</th>
              <th className="text-start px-4 py-3 text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('templateEnabled')}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {loading && (
              <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Loading…</td></tr>
            )}
            {!loading && templates.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground">
                  <p className="font-semibold">{t('noTemplates')}</p>
                  <p className="text-xs mt-1">{t('createFirst')}</p>
                </td>
              </tr>
            )}
            {templates.map((tmpl) => (
              <tr key={tmpl.id} className="hover:bg-muted/30 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground">{tmpl.name}</td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground hidden md:table-cell">{tmpl.key}</td>
                <td className="px-4 py-3 hidden lg:table-cell">
                  <span className={cn('px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide', CHANNEL_COLORS[tmpl.channel] ?? 'bg-muted text-muted-foreground')}>
                    {tmpl.channel}
                  </span>
                </td>
                <td className="px-4 py-3 text-muted-foreground hidden lg:table-cell capitalize">{tmpl.category}</td>
                <td className="px-4 py-3">
                  <button
                    onClick={() => handleToggle(tmpl.id)}
                    className={cn('flex items-center gap-1.5 text-xs font-semibold transition-colors', tmpl.is_enabled ? 'text-green-600' : 'text-muted-foreground')}
                  >
                    {tmpl.is_enabled
                      ? <><ToggleRight size={16} />{t('templateEnabled')}</>
                      : <><ToggleLeft  size={16} />{t('templateDisabled')}</>
                    }
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2 justify-end">
                    <button
                      onClick={() => router.push(`/notifications/templates/${tmpl.id}/edit`)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(tmpl.id, tmpl.name)}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {count > 20 && (
        <div className="flex items-center justify-between mt-4 text-sm text-muted-foreground">
          <span>{tc('items', { count })}</span>
          <div className="flex items-center gap-3">
            <span className="text-xs">{tc('pageOf', { page, total: Math.ceil(count / 20) })}</span>
            <div className="flex gap-1.5">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
              >
                {tc('previous')}
              </button>
              <button
                disabled={page * 20 >= count}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg border border-border text-xs font-medium disabled:opacity-40 hover:bg-muted transition-colors"
              >
                {tc('next')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
