'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import { createAdminTemplate, updateAdminTemplate } from '@/actions/notifications';
import type { NotificationTemplate } from '@/types/api';

const CATEGORIES = ['auth', 'subscription', 'stock', 'marketing', 'system', 'other'];
const CHANNELS   = ['push', 'sms', 'both'];

interface Props {
  initial?: NotificationTemplate;
}

export default function TemplateForm({ initial }: Props) {
  const t      = useTranslations('notifications');
  const router = useRouter();

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
  const [previewLocale, setPreviewLocale] = useState<'en' | 'ar'>('en');
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const previewTitle = previewLocale === 'ar' ? form.title_ar || form.title_en : form.title_en;
  const previewBody  = previewLocale === 'ar' ? form.body_ar  || form.body_en  : form.body_en;

  function set(key: keyof typeof form, value: string | boolean) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

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
      router.push('/notifications/templates');
      router.refresh();
    } catch (err: unknown) {
      const body = (err as { body?: unknown })?.body;
      if (body && typeof body === 'object') {
        const msgs = Object.entries(body as Record<string, string[]>).map(([k, v]) => `${k}: ${v.join(', ')}`);
        setError(msgs.join('\n'));
      } else {
        setError('Something went wrong.');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700 whitespace-pre-wrap">
          {error}
        </div>
      )}

      {/* Row 1: key + name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('templateKey')} *</span>
          <input
            required
            value={form.key}
            onChange={(e) => set('key', e.target.value)}
            placeholder="welcome_message"
            className="mt-1.5 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
          />
          <p className="text-[11px] text-muted-foreground mt-1">{t('keyHint')}</p>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('templateName')} *</span>
          <input
            required
            value={form.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Welcome Message"
            className="mt-1.5 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
      </div>

      {/* Row 2: category + channel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('templateCategory')} *</span>
          <select
            value={form.category}
            onChange={(e) => set('category', e.target.value)}
            className="mt-1.5 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {CATEGORIES.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('templateChannel')} *</span>
          <select
            value={form.channel}
            onChange={(e) => set('channel', e.target.value)}
            className="mt-1.5 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          >
            {CHANNELS.map((c) => <option key={c} value={c} className="capitalize">{c}</option>)}
          </select>
        </label>
      </div>

      {/* Row 3: variables */}
      <label className="block">
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{t('templateVariables')}</span>
        <input
          value={form.variables}
          onChange={(e) => set('variables', e.target.value)}
          placeholder="owner_name, business_name, amount"
          className="mt-1.5 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary font-mono"
        />
        <p className="text-[11px] text-muted-foreground mt-1">{t('variablesHint')}</p>
      </label>

      {/* English content */}
      <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">English</p>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">{t('templateTitleEn')} *</span>
          <input
            required
            value={form.title_en}
            onChange={(e) => set('title_en', e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">{t('templateBodyEn')} *</span>
          <textarea
            required
            rows={3}
            value={form.body_en}
            onChange={(e) => set('body_en', e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none font-mono"
          />
        </label>
      </div>

      {/* Arabic content */}
      <div className="space-y-3 p-4 rounded-xl border border-border bg-muted/20" dir="rtl">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider" dir="ltr">Arabic</p>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">{t('templateTitleAr')}</span>
          <input
            value={form.title_ar}
            onChange={(e) => set('title_ar', e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary text-right"
          />
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-muted-foreground">{t('templateBodyAr')}</span>
          <textarea
            rows={3}
            value={form.body_ar}
            onChange={(e) => set('body_ar', e.target.value)}
            className="mt-1 w-full px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none text-right"
          />
        </label>
      </div>

      {/* Live preview */}
      <div className="p-4 rounded-xl border border-border bg-[#0D1117] text-white">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-white/50 text-xs">
            <Eye size={12} />
            <span className="font-semibold uppercase tracking-wider">{t('templatePreview')}</span>
          </div>
          <div className="flex gap-1">
            {(['en', 'ar'] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setPreviewLocale(l)}
                className={`px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase transition-colors ${previewLocale === l ? 'bg-white/15 text-white' : 'text-white/30 hover:text-white/60'}`}
              >
                {l}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1" dir={previewLocale === 'ar' ? 'rtl' : 'ltr'}>
          <p className="text-[13px] font-bold text-white/90">{previewTitle || '—'}</p>
          <p className="text-xs text-white/55 leading-relaxed">{previewBody || '—'}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={form.is_enabled}
            onChange={(e) => set('is_enabled', e.target.checked)}
            className="rounded border-border"
          />
          <span className="text-sm text-muted-foreground">{t('templateEnabled')}</span>
        </label>
        <div className="flex-1" />
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : t('templateSaved')}
        </button>
      </div>
    </form>
  );
}
