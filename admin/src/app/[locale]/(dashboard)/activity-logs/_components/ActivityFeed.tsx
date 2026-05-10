import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import type { ActivityLog, ActivityAction, ActivityEntityType } from '@/types/api';

// ── Action config ─────────────────────────────────────────────────────────────

type ActionConfig = {
  color:  string;
  dot:    string;
  verb:   string;
};

const ACTION_CONFIG: Record<ActivityAction, ActionConfig> = {
  owner_created:        { color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', verb: 'created owner' },
  owner_updated:        { color: 'text-blue-600 dark:text-blue-400',       dot: 'bg-blue-500',    verb: 'updated owner' },
  owner_activated:      { color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', verb: 'activated owner' },
  owner_deactivated:    { color: 'text-rose-600 dark:text-rose-400',       dot: 'bg-rose-500',    verb: 'deactivated owner' },
  business_created:     { color: 'text-violet-600 dark:text-violet-400',   dot: 'bg-violet-500',  verb: 'created business' },
  business_updated:     { color: 'text-blue-600 dark:text-blue-400',       dot: 'bg-blue-500',    verb: 'updated business' },
  business_activated:   { color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', verb: 'activated business' },
  business_deactivated: { color: 'text-rose-600 dark:text-rose-400',       dot: 'bg-rose-500',    verb: 'deactivated business' },
  subscription_created:     { color: 'text-amber-600 dark:text-amber-400', dot: 'bg-amber-500',   verb: 'created subscription' },
  subscription_updated:     { color: 'text-blue-600 dark:text-blue-400',   dot: 'bg-blue-500',    verb: 'updated subscription' },
  subscription_deactivated: { color: 'text-rose-600 dark:text-rose-400',   dot: 'bg-rose-500',    verb: 'deactivated subscription' },
  plan_created:     { color: 'text-violet-600 dark:text-violet-400', dot: 'bg-violet-500', verb: 'created plan' },
  plan_updated:     { color: 'text-blue-600 dark:text-blue-400',     dot: 'bg-blue-500',   verb: 'updated plan' },
  plan_activated:   { color: 'text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500', verb: 'activated plan' },
  plan_deactivated: { color: 'text-rose-600 dark:text-rose-400',     dot: 'bg-rose-500',   verb: 'deactivated plan' },
};

const ENTITY_HREF: Record<ActivityEntityType, (id: string) => string> = {
  owner:        (id) => `/owners/${id}`,
  business:     (id) => `/businesses/${id}`,
  subscription: (id) => `/subscriptions/${id}`,
  plan:         (id) => `/plans/${id}`,
};

// ── Feed item ─────────────────────────────────────────────────────────────────

async function FeedItem({ log }: { log: ActivityLog }) {
  const t = await getTranslations('activityLog');
  const cfg  = ACTION_CONFIG[log.action] ?? { color: 'text-muted-foreground', dot: 'bg-border', verb: log.action };
  const href = log.entity_id ? ENTITY_HREF[log.entity_type]?.(log.entity_id) : null;
  const date = new Date(log.created_at);
  const now  = Date.now();
  const diff = now - date.getTime();
  const ago  = diff < 60_000
    ? t('timeJustNow')
    : diff < 3_600_000
    ? `${Math.floor(diff / 60_000)}${t('timeAgoMin')}`
    : diff < 86_400_000
    ? `${Math.floor(diff / 3_600_000)}${t('timeAgoHour')}`
    : `${Math.floor(diff / 86_400_000)}${t('timeAgoDay')}`;
  const full = date.toLocaleString();

  return (
    <div className="flex gap-3 group">
      {/* Timeline dot */}
      <div className="flex flex-col items-center pt-1">
        <span className={`w-2.5 h-2.5 rounded-full shrink-0 ring-2 ring-background ${cfg.dot}`} />
        <span className="w-px flex-1 bg-border/60 mt-1.5" />
      </div>

      {/* Content */}
      <div className="flex-1 pb-5 min-w-0">
        <div className="flex items-start gap-2 flex-wrap">
          <span className="text-[13px] font-semibold text-foreground/80 shrink-0">
            {log.actor_name ?? log.actor_phone ?? 'Admin'}
          </span>
          <span className={`text-[13px] font-medium ${cfg.color}`}>{cfg.verb}</span>
          {href ? (
            <Link href={href} className="text-[13px] font-semibold text-foreground hover:text-primary transition-colors truncate max-w-[200px]">
              {log.entity_label || log.entity_id}
            </Link>
          ) : (
            <span className="text-[13px] font-semibold text-foreground truncate max-w-[200px]">
              {log.entity_label || log.entity_id}
            </span>
          )}
        </div>

        {/* Metadata pills */}
        {Object.keys(log.metadata).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            {Object.entries(log.metadata).map(([k, v]) => (
              <span key={k} className="text-[11px] bg-muted rounded-md px-1.5 py-0.5 text-muted-foreground">
                {k}: {String(v)}
              </span>
            ))}
          </div>
        )}

        <time
          dateTime={log.created_at}
          title={full}
          className="text-[11px] text-muted-foreground/60 mt-1 block"
        >
          {ago}
        </time>
      </div>
    </div>
  );
}

// ── Feed ──────────────────────────────────────────────────────────────────────

interface Props {
  logs: ActivityLog[];
}

export default async function ActivityFeed({ logs }: Props) {
  const t = await getTranslations('activityLog');
  if (logs.length === 0) {
    return (
      <div className="text-center py-16 text-muted-foreground text-sm">
        {t('empty')}
      </div>
    );
  }

  return (
    <div className="relative">
      {logs.map((log) => (
        <FeedItem key={log.id} log={log} />
      ))}
    </div>
  );
}
