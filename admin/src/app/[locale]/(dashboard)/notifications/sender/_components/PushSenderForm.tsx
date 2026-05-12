'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Send, CheckCircle2, AlertCircle } from 'lucide-react';
import UserSearchSelector from './UserSearchSelector';
import { adminSendPush, adminSendSMS, fetchAdminTemplates } from '@/services/notifications';
import type { NotificationTemplate } from '@/types/api';
import { cn } from '@/lib/utils';

type Mode = 'push' | 'sms';

interface UserOption { id: string; full_name: string; phone: string; role: string }

export default function PushSenderForm() {
  const t = useTranslations('notifications');

  const [mode,        setMode]        = useState<Mode>('push');
  const [user,        setUser]        = useState<UserOption | null>(null);
  const [templates,   setTemplates]   = useState<NotificationTemplate[]>([]);
  const [templateId,  setTemplateId]  = useState('');
  const [useTemplate, setUseTemplate] = useState(false);
  const [title,       setTitle]       = useState('');
  const [body,        setBody]        = useState('');
  const [message,     setMessage]     = useState('');
  const [sending,     setSending]     = useState(false);
  const [result,      setResult]      = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    fetchAdminTemplates({ channel: mode === 'push' ? 'push' : 'sms', enabled: 'true', page_size: 50 })
      .then((r) => setTemplates(r.results));
  }, [mode]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSending(true);
    setResult(null);
    try {
      if (mode === 'push') {
        const res = await adminSendPush(
          useTemplate && templateId
            ? { user_id: user.id, template_id: templateId }
            : { user_id: user.id, title, body },
        );
        setResult({ ok: true, text: t('sentDevices', { count: res.device_count }) });
      } else {
        await adminSendSMS(
          useTemplate && templateId
            ? { user_id: user.id, template_id: templateId }
            : { user_id: user.id, message },
        );
        setResult({ ok: true, text: t('smsSent') });
      }
    } catch (err: unknown) {
      const msg = (err as { body?: { message?: string }; message?: string })?.body?.message
        ?? (err as { message?: string })?.message
        ?? 'Failed to send.';
      setResult({ ok: false, text: msg });
    } finally {
      setSending(false);
    }
  }

  return (
    <form onSubmit={handleSend} className="max-w-lg space-y-5">
      {/* Mode toggle */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl w-fit">
        {(['push', 'sms'] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => { setMode(m); setResult(null); }}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-semibold transition-all',
              mode === m ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {m === 'push' ? t('sendPush') : t('sendSMS')}
          </button>
        ))}
      </div>

      {/* User selector */}
      <div>
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1.5">{t('targetUser')} *</p>
        <UserSearchSelector value={user} onChange={setUser} placeholder={t('searchUsers')} />
      </div>

      {/* Template or custom */}
      <div className="flex gap-3">
        {(['template', 'custom'] as const).map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => setUseTemplate(opt === 'template')}
            className={cn(
              'flex-1 py-2 rounded-lg border text-sm font-semibold transition-all',
              useTemplate === (opt === 'template')
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-muted',
            )}
          >
            {opt === 'template' ? t('chooseTemplate') : t('customMessage')}
          </button>
        ))}
      </div>

      {useTemplate ? (
        <select
          value={templateId}
          onChange={(e) => setTemplateId(e.target.value)}
          required
          className="w-full px-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <option value="">— {t('chooseTemplate')} —</option>
          {templates.map((tmpl) => (
            <option key={tmpl.id} value={tmpl.id}>{tmpl.name}</option>
          ))}
        </select>
      ) : mode === 'push' ? (
        <div className="space-y-3">
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={`${t('templateTitleEn')}…`}
            className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary"
          />
          <textarea
            required
            rows={3}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={`${t('templateBodyEn')}…`}
            className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </div>
      ) : (
        <textarea
          required
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="SMS message…"
          className="w-full px-3 py-2 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
      )}

      {/* Result */}
      {result && (
        <div className={cn(
          'flex items-center gap-2 p-3 rounded-xl text-sm font-medium',
          result.ok
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200',
        )}>
          {result.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          {result.text}
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={sending || !user}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
      >
        <Send size={14} />
        {sending ? t('sending') : mode === 'push' ? t('sendPush') : t('sendSMS')}
      </button>
    </form>
  );
}
