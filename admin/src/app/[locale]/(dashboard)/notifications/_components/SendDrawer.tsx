'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, X, Send } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { adminSendPush, adminSendSMS, fetchAdminTemplates, searchOwnersAction } from '../actions';
import type { NotificationTemplate } from '@/types/api';

type Mode = 'push' | 'sms';
interface UserOption { id: string; full_name: string; phone: string; role: string }

function UserSearch({ value, onChange }: { value: UserOption | null; onChange: (u: UserOption | null) => void }) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<UserOption[]>([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        setResults(await searchOwnersAction(query));
        setOpen(true);
      } catch { setResults([]); }
      finally  { setLoading(false); }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query]);

  if (value) {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
        <div>
          <p className="text-sm font-semibold text-foreground">{value.full_name}</p>
          <p className="text-xs text-muted-foreground">{value.phone}</p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
        <input
          type="search" value={query} onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or phone…"
          className="w-full ps-9 pe-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {loading && <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">…</span>}
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          {results.map((u) => (
            <button key={u.id} type="button"
              onClick={() => { onChange(u); setOpen(false); setQuery(''); }}
              className="w-full text-start px-4 py-2.5 hover:bg-muted transition-colors border-b border-border last:border-0"
            >
              <p className="text-sm font-semibold text-foreground">{u.full_name}</p>
              <p className="text-xs text-muted-foreground">{u.phone}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function SendDrawer({ onClose }: { onClose?: () => void }) {
  const t      = useTranslations('notifications');
  const router = useRouter();

  const [mode,        setMode]        = useState<Mode>('push');
  const [user,        setUser]        = useState<UserOption | null>(null);
  const [templates,   setTemplates]   = useState<NotificationTemplate[]>([]);
  const [templateId,  setTemplateId]  = useState('');
  const [useTemplate, setUseTemplate] = useState(false);
  const [title,       setTitle]       = useState('');
  const [body,        setBody]        = useState('');
  const [message,     setMessage]     = useState('');
  const [variables,   setVariables]   = useState<Record<string, string>>({});
  const [sending, setSending] = useState(false);

  const selectedTemplate = templates.find((t) => t.id === templateId) ?? null;

  useEffect(() => {
    fetchAdminTemplates({ channel: mode === 'push' ? 'push' : 'sms', enabled: 'true', page_size: 50 })
      .then((r) => setTemplates(r.results));
    setTemplateId('');
    setVariables({});
  }, [mode]);

  useEffect(() => {
    setVariables({});
  }, [templateId]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSending(true);
    try {
      if (mode === 'push') {
        const res = await adminSendPush(
          useTemplate && templateId
            ? { user_id: user.id, template_id: templateId, variables }
            : { user_id: user.id, title, body },
        );
        toast.success(t('sentDevices', { count: res.device_count }));
      } else {
        await adminSendSMS(
          useTemplate && templateId
            ? { user_id: user.id, template_id: templateId, variables }
            : { user_id: user.id, message },
        );
        toast.success(t('smsSent'));
      }
      router.refresh();
      onClose?.();
    } catch (err: unknown) {
      const msg = (err as { body?: { message?: string }; message?: string })?.body?.message
        ?? (err as { message?: string })?.message ?? 'Failed to send.';
      toast.error(msg);
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSend} className="flex flex-col gap-5 h-full overflow-y-auto px-5 py-4">
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {(['push', 'sms'] as Mode[]).map((m) => (
          <button key={m} type="button" onClick={() => setMode(m)}
            className={cn('px-4 py-1.5 rounded-lg text-sm font-semibold transition-all',
              mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            {m === 'push' ? t('sendPush') : t('sendSMS')}
          </button>
        ))}
      </div>

      {/* Recipient */}
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{t('targetUser')} *</p>
        <UserSearch value={user} onChange={setUser} />
      </div>

      {/* Template or custom */}
      <div className="flex gap-2">
        {(['template', 'custom'] as const).map((opt) => (
          <button key={opt} type="button" onClick={() => setUseTemplate(opt === 'template')}
            className={cn('flex-1 py-2 rounded-lg border text-sm font-semibold transition-all',
              useTemplate === (opt === 'template')
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted')}
          >
            {opt === 'template' ? t('chooseTemplate') : t('customMessage')}
          </button>
        ))}
      </div>

      {useTemplate ? (
        <div className="space-y-3">
          <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} required
            className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">— {t('chooseTemplate')} —</option>
            {templates.map((tmpl) => <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>)}
          </select>

          {selectedTemplate && selectedTemplate.variables.length > 0 && (
            <div className="space-y-2 p-3 rounded-xl bg-muted/40 border border-border">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Template Variables</p>
              {selectedTemplate.variables.map((varName) => (
                <div key={varName}>
                  <label className="text-xs text-muted-foreground mb-1 block font-mono">{`{${varName}}`}</label>
                  <input
                    required
                    value={variables[varName] ?? ''}
                    onChange={(e) => setVariables((prev) => ({ ...prev, [varName]: e.target.value }))}
                    placeholder={varName}
                    className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      ) : mode === 'push' ? (
        <div className="space-y-3">
          <input required value={title} onChange={(e) => setTitle(e.target.value)}
            placeholder={`${t('templateTitleEn')}…`}
            className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <textarea required rows={3} value={body} onChange={(e) => setBody(e.target.value)}
            placeholder={`${t('templateBodyEn')}…`}
            className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>
      ) : (
        <textarea required rows={3} value={message} onChange={(e) => setMessage(e.target.value)}
          placeholder="SMS message…"
          className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      )}


<div className="mt-auto pt-2">
        <button type="submit" disabled={sending || !user}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          <Send size={14} />
          {sending ? t('sending') : mode === 'push' ? t('sendPush') : t('sendSMS')}
        </button>
      </div>
    </form>
  );
}
