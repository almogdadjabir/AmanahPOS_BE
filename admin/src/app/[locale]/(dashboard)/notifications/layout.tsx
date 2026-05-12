import { getTranslations } from 'next-intl/server';
import { Bell, Send, ScrollText, Settings2 } from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { headers } from 'next/headers';

const TABS = [
  { key: 'tabTemplates', href: '/notifications/templates', Icon: Bell },
  { key: 'tabSender',    href: '/notifications/sender',    Icon: Send },
  { key: 'tabLogs',      href: '/notifications/logs',      Icon: ScrollText },
  { key: 'tabSettings',  href: '/notifications/settings',  Icon: Settings2 },
] as const;

export default async function NotificationsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations('notifications');
  const headersList = await headers();
  const pathname = headersList.get('x-pathname') ?? '';

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <Bell size={20} />
        </span>
        <div>
          <h1 className="text-[22px] font-black text-foreground tracking-tight leading-tight">
            {t('title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">{t('description')}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 p-1 bg-muted rounded-xl mb-6 w-fit overflow-x-auto">
        {TABS.map(({ key, href, Icon }) => {
          const segment = href.split('/notifications')[1] ?? '';
          const active = segment ? pathname.includes(segment) : pathname.endsWith('/notifications');
          return (
            <Link
              key={key}
              href={href}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all whitespace-nowrap ${
                active
                  ? 'bg-card text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon size={14} />
              {t(key)}
            </Link>
          );
        })}
      </div>

      {children}
    </div>
  );
}
