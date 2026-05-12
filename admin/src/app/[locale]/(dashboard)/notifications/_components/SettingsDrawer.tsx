'use client';

import { useState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchAdminNotifSettings, updateAdminNotifSettings } from '../actions';
import type { NotificationSetting } from '@/types/api';

const BOOLEAN_KEYS = ['push_enabled', 'sms_enabled'];
const NUMBER_KEYS  = ['push_daily_limit', 'sms_daily_limit'];

type TKey = 'pushEnabled' | 'smsEnabled' | 'pushDailyLimit' | 'smsDailyLimit'
          | 'pushEnabledDesc' | 'smsEnabledDesc' | 'pushDailyLimitDesc' | 'smsDailyLimitDesc';

const KEY_META: Record<string, { titleKey: TKey; descKey: TKey }> = {
  push_enabled:     { titleKey: 'pushEnabled',    descKey: 'pushEnabledDesc' },
  sms_enabled:      { titleKey: 'smsEnabled',     descKey: 'smsEnabledDesc' },
  push_daily_limit: { titleKey: 'pushDailyLimit', descKey: 'pushDailyLimitDesc' },
  sms_daily_limit:  { titleKey: 'smsDailyLimit',  descKey: 'smsDailyLimitDesc' },
};

export default function SettingsDrawer() {
  const t = useTranslations('notifications');
  const [settings, setSettings] = useState<NotificationSetting[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);

  useEffect(() => {
    fetchAdminNotifSettings().then((s) => { setSettings(s); setLoading(false); });
  }, []);

  function setValue(key: string, value: string) {
    setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
  }

  function get(key: string) {
    return settings.find((s) => s.key === key)?.value ?? '';
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await updateAdminNotifSettings(settings.map((s) => ({ key: s.key, value: s.value })));
      setSettings(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="px-5 py-4 space-y-3">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-16 rounded-xl bg-muted animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="px-5 py-4 space-y-4">
      {BOOLEAN_KEYS.filter((k) => KEY_META[k]).map((key) => {
        const meta    = KEY_META[key];
        const enabled = get(key).toLowerCase() === 'true';
        return (
          <div key={key} className="flex items-center justify-between p-4 rounded-xl border border-border bg-card">
            <div>
              <p className="text-sm font-semibold text-foreground">{t(meta.titleKey)}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{t(meta.descKey)}</p>
            </div>
            <button type="button" onClick={() => setValue(key, enabled ? 'false' : 'true')}
              className={cn('relative w-11 h-6 rounded-full transition-colors shrink-0',
                enabled ? 'bg-primary' : 'bg-muted-foreground/30')}
            >
              <span className={cn('absolute top-0.5 start-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
                enabled ? 'translate-x-5 [dir=rtl]:-translate-x-5' : 'translate-x-0')} />
            </button>
          </div>
        );
      })}

      {NUMBER_KEYS.filter((k) => KEY_META[k]).map((key) => {
        const meta = KEY_META[key];
        return (
          <div key={key} className="p-4 rounded-xl border border-border bg-card">
            <p className="text-sm font-semibold text-foreground">{t(meta.titleKey)}</p>
            <p className="text-xs text-muted-foreground mt-0.5 mb-3">{t(meta.descKey)}</p>
            <input type="number" min={0} value={get(key)} onChange={(e) => setValue(key, e.target.value)}
              className="w-32 px-3 py-2 text-sm border border-border rounded-lg bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
        );
      })}

      <div className="flex items-center gap-3 pt-2">
        <button type="button" onClick={handleSave} disabled={saving}
          className="px-5 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {saving ? 'Saving…' : t('settingsSaved')}
        </button>
        {saved && (
          <span className="flex items-center gap-1.5 text-sm text-success">
            <CheckCircle2 size={14} />{t('settingsSaved')}
          </span>
        )}
      </div>
    </div>
  );
}
