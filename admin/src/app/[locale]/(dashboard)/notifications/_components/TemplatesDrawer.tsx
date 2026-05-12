'use client';

import { useState, useEffect, useTransition } from 'react';
import { useTranslations } from 'next-intl';
import { Eye, Plus, ToggleLeft, ToggleRight, Trash2, Edit2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  fetchAdminTemplates, toggleAdminTemplate, deleteAdminTemplate,
  createAdminTemplate, updateAdminTemplate,
} from '../actions';
import type { NotificationTemplate } from '@/types/api';

const CATEGORIES = ['auth', 'subscription', 'stock', 'marketing', 'system', 'other'];
const CHANNELS   = ['push', 'sms', 'both'];

const CH_COLORS: Record<string, string> = {
  push: 'bg-primary/10 text-primary',
  sms:  'bg-violet-500/10 text-violet-600',
  both: 'bg-emerald-500/10 text-emerald-600',
};

type View = 'list' | 'form';

function TemplateForm({
  initial, onDone,
}: {
  initial?: NotificationTemplate;
  onDone: () => void;
}) {
  const t = useTranslations('notifications');
  const [form, setForm] = useState({
    key:        initial?.key        ?? '',
    name:       initial?.name       ?? '',
    category:   initial?.category   ?? 'system',
    channel:    initial?.channel    ?? 'push',
    title_en:   initial?.title_en   ?? '',
    body_en:    initial?.body_en    ?? '',
    title_ar:   initial?.title_ar   ?? '',
    body_ar:    initial?.body_ar    ?? '',
    variables:  (initial?.variables ?? []).join(', '),
    is_enabled: initial?.is_enabled ?? true,
  });
  const [previewLang, setPreviewLang] = useState<'en' | 'ar'>('en');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  function set(k: keyof typeof form, v: string | boolean) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const previewTitle = previewLang === 'ar' ? form.title_ar || form.title_en : form.title_en;
  const previewBody  = previewLang === 'ar' ? form.body_ar  || form.body_en  : form.body_en;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        variables: form.variables.split(',').map((v) => v.trim()).filter(Boolean),
      };
      if (initial) {
        await updateAdminTemplate(initial.id, payload);
      } else {
        await createAdminTemplate(payload);
      }
      onDone();
    } catch (err: unknown) {
      const body = (err as { body?: unknown })?.body;
      if (body && typeof body === 'object') {
        setError(Object.entries(body as Record<string, string[]>).map(([k, v]) => `${k}: ${v.join(', ')}`).join('\n'));
      } else {
        setError('Something went wrong.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 px-5 py-4 overflow-y-auto h-full">
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive whitespace-pre-wrap">{error}</div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <label className="block col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('templateKey')} *</span>
          <input required value={form.key} onChange={(e) => set('key', e.target.value)} placeholder="welcome_message"
            className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
          />
        </label>
        <label className="block col-span-2 sm:col-span-1">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('templateName')} *</span>
          <input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Welcome Message"
            className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('templateCategory')}</span>
          <select value={form.category} onChange={(e) => set('category', e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('templateChannel')}</span>
          <select value={form.channel} onChange={(e) => set('channel', e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {CHANNELS.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </label>
      </div>

      <label className="block">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">{t('templateVariables')}</span>
        <input value={form.variables} onChange={(e) => set('variables', e.target.value)} placeholder="owner_name, business_name"
          className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
        />
      </label>

      <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-3">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">English</p>
        <input required value={form.title_en} onChange={(e) => set('title_en', e.target.value)} placeholder="Title (EN)"
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <textarea required rows={2} value={form.body_en} onChange={(e) => set('body_en', e.target.value)} placeholder="Body (EN)"
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      </div>

      <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-3" dir="rtl">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider" dir="ltr">Arabic</p>
        <input value={form.title_ar} onChange={(e) => set('title_ar', e.target.value)} placeholder="العنوان (عربي)"
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary text-right"
        />
        <textarea rows={2} value={form.body_ar} onChange={(e) => set('body_ar', e.target.value)} placeholder="النص (عربي)"
          className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none text-right"
        />
      </div>

      {/* Preview */}
      <div className="p-3 rounded-xl border border-border bg-[#0D1117] text-white">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-white/40 text-[10px]">
            <Eye size={11} /><span className="font-bold uppercase tracking-wider">Preview</span>
          </div>
          <div className="flex gap-1">
            {(['en', 'ar'] as const).map((l) => (
              <button key={l} type="button" onClick={() => setPreviewLang(l)}
                className={cn('px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-colors',
                  previewLang === l ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60')}
              >{l}</button>
            ))}
          </div>
        </div>
        <div dir={previewLang === 'ar' ? 'rtl' : 'ltr'} className="space-y-0.5">
          <p className="text-[13px] font-bold text-white/90">{previewTitle || '—'}</p>
          <p className="text-xs text-white/50 leading-relaxed">{previewBody || '—'}</p>
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.is_enabled} onChange={(e) => set('is_enabled', e.target.checked)} className="rounded border-border" />
        <span className="text-sm text-muted-foreground">{t('templateEnabled')}</span>
      </label>

      <div className="sticky bottom-0 bg-card pt-3 border-t border-border mt-auto flex gap-2">
        <button type="submit" disabled={saving}
          className="flex-1 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : t('templateSaved')}
        </button>
      </div>
    </form>
  );
}

export default function TemplatesDrawer() {
  const t = useTranslations('notifications');
  const [view,      setView]      = useState<View>('list');
  const [editing,   setEditing]   = useState<NotificationTemplate | undefined>(undefined);
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [, startTransition] = useTransition();

  async function load() {
    setLoading(true);
    try {
      const res = await fetchAdminTemplates({ page_size: 50 });
      setTemplates(res.results);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleToggle(id: string) {
    const updated = await toggleAdminTemplate(id);
    setTemplates((prev) => prev.map((tmpl) => (tmpl.id === id ? { ...tmpl, is_enabled: updated.is_enabled } : tmpl)));
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete template "${name}"?`)) return;
    await deleteAdminTemplate(id);
    startTransition(() => { load(); });
  }

  if (view === 'form') {
    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-border shrink-0">
          <button type="button" onClick={() => { setView('list'); setEditing(undefined); }}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <ArrowLeft size={15} />
          </button>
          <p className="text-sm font-semibold text-foreground">
            {editing ? t('templateName') : t('newTemplate')}
          </p>
        </div>
        <div className="flex-1 overflow-hidden">
          <TemplateForm initial={editing} onDone={() => { setView('list'); setEditing(undefined); load(); }} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-5 py-3 border-b border-border shrink-0">
        <button
          type="button"
          onClick={() => { setEditing(undefined); setView('form'); }}
          className="flex items-center gap-2 w-full px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors justify-center"
        >
          <Plus size={14} />
          {t('newTemplate')}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && (
          <div className="space-y-1 p-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-14 rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!loading && templates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-sm font-semibold text-foreground">{t('noTemplates')}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('createFirst')}</p>
          </div>
        )}

        {!loading && templates.map((tmpl) => (
          <div key={tmpl.id} className="flex items-center gap-3 px-4 py-3 border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-foreground truncate">{tmpl.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <code className="text-[10px] text-muted-foreground font-mono">{tmpl.key}</code>
                <span className={cn('px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide', CH_COLORS[tmpl.channel] ?? 'bg-muted text-muted-foreground')}>
                  {tmpl.channel}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={() => handleToggle(tmpl.id)}
                className={cn('p-1.5 rounded-lg transition-colors', tmpl.is_enabled ? 'text-success hover:bg-success/10' : 'text-muted-foreground hover:bg-muted')}
              >
                {tmpl.is_enabled ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
              </button>
              <button onClick={() => { setEditing(tmpl); setView('form'); }}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Edit2 size={14} />
              </button>
              <button onClick={() => handleDelete(tmpl.id, tmpl.name)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
