import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import type { ActivityLog, ActivityAction, ActivityEntityType } from '@/types/api';

// ── Action badge config ───────────────────────────────────────────────────────

type ActionCfg = { bg: string; text: string; dot: string; label: string };

const ACTION_CFG: Record<ActivityAction, ActionCfg> = {
  owner_created:            { bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'owner created' },
  owner_updated:            { bg: 'bg-sky-50',      text: 'text-sky-700',     dot: 'bg-sky-500',     label: 'owner updated' },
  owner_activated:          { bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'owner activated' },
  owner_deactivated:        { bg: 'bg-rose-50',     text: 'text-rose-700',    dot: 'bg-rose-500',    label: 'owner deactivated' },
  business_created:         { bg: 'bg-violet-50',   text: 'text-violet-700',  dot: 'bg-violet-500',  label: 'biz created' },
  business_updated:         { bg: 'bg-sky-50',      text: 'text-sky-700',     dot: 'bg-sky-500',     label: 'biz updated' },
  business_activated:       { bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'biz activated' },
  business_deactivated:     { bg: 'bg-rose-50',     text: 'text-rose-700',    dot: 'bg-rose-500',    label: 'biz deactivated' },
  subscription_created:     { bg: 'bg-amber-50',    text: 'text-amber-700',   dot: 'bg-amber-500',   label: 'sub created' },
  subscription_updated:     { bg: 'bg-sky-50',      text: 'text-sky-700',     dot: 'bg-sky-500',     label: 'sub updated' },
  subscription_deactivated: { bg: 'bg-rose-50',     text: 'text-rose-700',    dot: 'bg-rose-500',    label: 'sub deactivated' },
  plan_created:             { bg: 'bg-violet-50',   text: 'text-violet-700',  dot: 'bg-violet-500',  label: 'plan created' },
  plan_updated:             { bg: 'bg-sky-50',      text: 'text-sky-700',     dot: 'bg-sky-500',     label: 'plan updated' },
  plan_activated:           { bg: 'bg-emerald-50',  text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'plan activated' },
  plan_deactivated:         { bg: 'bg-rose-50',     text: 'text-rose-700',    dot: 'bg-rose-500',    label: 'plan deactivated' },
};

// plan has no detail page yet — only owner, business, subscription are linkable
const ENTITY_HREF: Partial<Record<ActivityEntityType, (id: string) => string>> = {
  owner:        (id) => `/owners/${id}`,
  business:     (id) => `/businesses/${id}`,
  subscription: (id) => `/subscriptions/${id}`,
};

// ── Avatar ────────────────────────────────────────────────────────────────────

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(' ');
  const init  = parts.length >= 2
    ? `${parts[0][0]}${parts[1][0]}`
    : name.slice(0, 2);
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 uppercase">
      {init}
    </span>
  );
}

// ── Relative time ─────────────────────────────────────────────────────────────

function relativeTime(
  isoDate: string,
  t: { (k: string): string },
): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  if (diff < 60_000)     return t('timeJustNow');
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}${t('timeAgoMin')}`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}${t('timeAgoHour')}`;
  return `${Math.floor(diff / 86_400_000)}${t('timeAgoDay')}`;
}

// ── Single row ────────────────────────────────────────────────────────────────

async function LogRow({ log, idx }: { log: ActivityLog; idx: number }) {
  const t   = await getTranslations('activityLog');
  const cfg = ACTION_CFG[log.action] ?? {
    bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-border', label: log.action,
  };

  const entityHref = log.entity_id
    ? ENTITY_HREF[log.entity_type]?.(log.entity_id)
    : null;

  const actorLabel = log.actor_name || log.actor_phone || t('noPhone');
  const ago        = relativeTime(log.created_at, (k) => t(k as Parameters<typeof t>[0]));
  const fullDate   = new Date(log.created_at).toLocaleString();

  return (
    <tr
      className={`group border-b border-border/40 transition-colors hover:bg-primary/[.025] ${
        idx % 2 === 0 ? '' : 'bg-muted/20'
      }`}
    >
      {/* Actor */}
      <td className="px-4 py-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <Initials name={actorLabel} />
          <div className="min-w-0">
            <p className="text-[12px] font-semibold text-foreground truncate leading-tight max-w-[120px]">
              {actorLabel}
            </p>
            {log.actor_phone && log.actor_name && (
              <p className="text-[10px] text-muted-foreground font-mono truncate max-w-[120px]">
                {log.actor_phone}
              </p>
            )}
          </div>
        </div>
      </td>

      {/* Action badge */}
      <td className="px-4 py-2.5 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${cfg.bg} ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
          {cfg.label}
        </span>
      </td>

      {/* Entity */}
      <td className="px-4 py-2.5">
        <div className="min-w-0">
          {entityHref ? (
            <Link
              href={entityHref}
              className="text-[12px] font-medium text-primary hover:underline truncate block max-w-[160px]"
            >
              {log.entity_label || log.entity_id}
            </Link>
          ) : (
            <span className="text-[12px] font-medium text-foreground/80 truncate block max-w-[160px]">
              {log.entity_label || log.entity_id || '—'}
            </span>
          )}
          {Object.keys(log.metadata).length > 0 && (
            <div className="flex flex-wrap gap-1 mt-0.5">
              {Object.entries(log.metadata).slice(0, 2).map(([k, v]) => (
                <span key={k} className="text-[10px] bg-muted text-muted-foreground rounded px-1 py-px font-mono">
                  {k}:{String(v)}
                </span>
              ))}
            </div>
          )}
        </div>
      </td>

      {/* IP */}
      <td className="px-4 py-2.5 whitespace-nowrap">
        <span className="text-[11px] font-mono text-muted-foreground/70">
          {log.ip_address ?? t('ipUnknown')}
        </span>
      </td>

      {/* Time */}
      <td className="px-4 py-2.5 whitespace-nowrap text-end">
        <time
          dateTime={log.created_at}
          title={fullDate}
          className="text-[11px] font-mono text-muted-foreground cursor-default"
        >
          {ago}
        </time>
      </td>
    </tr>
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
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center text-muted-foreground text-lg">
          📋
        </div>
        <p className="text-[13px] text-muted-foreground">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full min-w-[640px]">
        <thead>
          <tr className="border-b border-border">
            {[t('colActor'), t('colAction'), t('colEntity'), t('colIp'), t('colTime')].map((h, i) => (
              <th
                key={h}
                className={`px-4 py-2 text-[10px] font-black tracking-[.12em] uppercase text-muted-foreground/60 text-start whitespace-nowrap ${
                  i === 4 ? 'text-end' : ''
                }`}
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {logs.map((log, idx) => (
            <LogRow key={log.id} log={log} idx={idx} />
          ))}
        </tbody>
      </table>
    </div>
  );
}
