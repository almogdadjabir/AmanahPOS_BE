'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Send, LayoutTemplate, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import SearchInput from '@/components/ds/SearchInput';
import { useNotifications } from './NotificationsContext';

function TabGroup<T extends string>({ label, tabs, value, onChange }: {
  label:    string;
  tabs:     readonly { label: string; value: T }[];
  value:    T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em] shrink-0">{label}</span>
      <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
        {tabs.map((tab) => (
          <button key={tab.value} type="button" onClick={() => onChange(tab.value)}
            className={cn('px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150',
              tab.value === value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground')}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function NotificationsControls() {
  const t = useTranslations('notifications');
  const { openSend, openTemplates, openSettings } = useNotifications();
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const channel = (searchParams.get('channel') ?? 'all') as 'all' | 'push' | 'sms';
  const status  = (searchParams.get('status')  ?? 'all') as 'all' | 'sent' | 'failed' | 'pending';

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value === 'all') params.delete(key); else params.set(key, value);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex items-center gap-3 flex-wrap mb-5 p-3 bg-card rounded-xl border border-border shadow-card">
      <SearchInput placeholder={t('searchPlaceholder')} className="w-full sm:w-56" />
      <div className="h-4 w-px bg-border hidden sm:block" />
      <TabGroup
        label={t('filterChannel')}
        tabs={[
          { label: t('tabAll'),      value: 'all'  },
          { label: t('channelPush'), value: 'push' },
          { label: t('channelSms'),  value: 'sms'  },
        ] as const}
        value={channel}
        onChange={(v) => setParam('channel', v)}
      />
      <div className="h-4 w-px bg-border hidden sm:block" />
      <TabGroup
        label={t('filterStatus')}
        tabs={[
          { label: t('tabAll'),        value: 'all'     },
          { label: t('statusSent'),    value: 'sent'    },
          { label: t('statusFailed'),  value: 'failed'  },
          { label: t('statusPending'), value: 'pending' },
        ] as const}
        value={status}
        onChange={(v) => setParam('status', v)}
      />
      <div className="flex-1" />
      <div className="flex items-center gap-2">
        <button type="button" onClick={openSettings} title={t('settingsTitle')}
          className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <Settings2 size={15} />
        </button>
        <button type="button" onClick={openTemplates}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <LayoutTemplate size={14} />
          {t('templatesTitle')}
        </button>
        <button type="button" onClick={openSend}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
        >
          <Send size={14} />
          {t('sendNotification')}
        </button>
      </div>
    </div>
  );
}
