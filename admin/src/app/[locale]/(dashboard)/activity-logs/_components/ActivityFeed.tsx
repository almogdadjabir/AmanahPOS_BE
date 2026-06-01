import { Link } from '@/i18n/navigation';
import { getTranslations } from 'next-intl/server';
import { History } from 'lucide-react';
import type { ActivityLog, ActivityAction, ActivityEntityType } from '@/types/api';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

// ── Action badge config — DS tokens only (Fix #6: no raw emerald/sky/rose/violet) ──

type ActionCfg = { bg: string; text: string; dot: string; label: string };

const ACTION_CFG: Record<ActivityAction, ActionCfg> = {
  // Created → success (teal-green)
  owner_created:            { bg: 'bg-success-light',  text: 'text-success',          dot: 'bg-[#12B981]', label: 'Owner Created' },
  owner_activated:          { bg: 'bg-success-light',  text: 'text-success',          dot: 'bg-[#12B981]', label: 'Owner Activated' },
  business_created:         { bg: 'bg-success-light',  text: 'text-success',          dot: 'bg-[#12B981]', label: 'Business Created' },
  business_activated:       { bg: 'bg-success-light',  text: 'text-success',          dot: 'bg-[#12B981]', label: 'Business Activated' },
  plan_created:             { bg: 'bg-success-light',  text: 'text-success',          dot: 'bg-[#12B981]', label: 'Plan Created' },
  plan_activated:           { bg: 'bg-success-light',  text: 'text-success',          dot: 'bg-[#12B981]', label: 'Plan Activated' },
  // Updated → info (blue)
  owner_updated:            { bg: 'bg-info-light',     text: 'text-info',             dot: 'bg-[#4A82F0]', label: 'Owner Updated' },
  business_updated:         { bg: 'bg-info-light',     text: 'text-info',             dot: 'bg-[#4A82F0]', label: 'Business Updated' },
  subscription_updated:     { bg: 'bg-info-light',     text: 'text-info',             dot: 'bg-[#4A82F0]', label: 'Sub Updated' },
  plan_updated:             { bg: 'bg-info-light',     text: 'text-info',             dot: 'bg-[#4A82F0]', label: 'Plan Updated' },
  // Subscription created → warning (amber)
  subscription_created:     { bg: 'bg-warning-light',  text: 'text-warning',          dot: 'bg-[#E89923]', label: 'Sub Created' },
  // Deactivated → danger (red) — Fix #9: red reserved for true errors/deactivations
  owner_deactivated:        { bg: 'bg-danger-light',   text: 'text-danger',           dot: 'bg-[#EC5B45]', label: 'Owner Deactivated' },
  business_deactivated:     { bg: 'bg-danger-light',   text: 'text-danger',           dot: 'bg-[#EC5B45]', label: 'Business Deactivated' },
  subscription_deactivated: { bg: 'bg-danger-light',   text: 'text-danger',           dot: 'bg-[#EC5B45]', label: 'Sub Deactivated' },
  plan_deactivated:         { bg: 'bg-danger-light',   text: 'text-danger',           dot: 'bg-[#EC5B45]', label: 'Plan Deactivated' },
};

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
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary-tint text-primary-700 text-[10px] font-semibold shrink-0 uppercase select-none">
      {init}
    </span>
  );
}

// ── Relative time ─────────────────────────────────────────────────────────────

function relativeTime(isoDate: string, t: { (k: string): string }): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  if (diff < 60_000)     return t('timeJustNow');
  if (diff < 3_600_000)  return `${Math.floor(diff / 60_000)}${t('timeAgoMin')}`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}${t('timeAgoHour')}`;
  return `${Math.floor(diff / 86_400_000)}${t('timeAgoDay')}`;
}

// ── Single row ────────────────────────────────────────────────────────────────

async function LogRow({ log }: { log: ActivityLog }) {
  const t   = await getTranslations('activityLog');
  const cfg = ACTION_CFG[log.action] ?? {
    bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground', label: log.action,
  };

  const entityHref = log.entity_id
    ? ENTITY_HREF[log.entity_type]?.(log.entity_id)
    : null;

  const actorLabel = log.actor_name || log.actor_phone || t('noPhone');
  const ago        = relativeTime(log.created_at, (k) => t(k as Parameters<typeof t>[0]));
  const fullDate   = new Date(log.created_at).toLocaleString();

  return (
    <TableRow className="border-b border-border/40 hover:bg-muted/40 transition-colors">
      {/* Actor */}
      <TableCell className="px-4 py-2.5">
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
      </TableCell>

      {/* Action badge — Fix #6: DS token colors */}
      <TableCell className="px-4 py-2.5 whitespace-nowrap">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ${cfg.bg} ${cfg.text}`}>
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${cfg.dot}`} />
          {cfg.label}
        </span>
      </TableCell>

      {/* Entity */}
      <TableCell className="px-4 py-2.5">
        <div className="min-w-0">
          {entityHref ? (
            <Link
              href={entityHref}
              className="text-[12px] font-medium text-primary hover:underline truncate block max-w-[160px]"
            >
              {log.entity_label || log.entity_id}
            </Link>
          ) : (
            <span className="text-[12px] font-medium text-foreground truncate block max-w-[160px]">
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
      </TableCell>

      {/* IP */}
      <TableCell className="px-4 py-2.5 whitespace-nowrap">
        <span className="text-[11px] font-mono text-muted-foreground">
          {log.ip_address ?? t('ipUnknown')}
        </span>
      </TableCell>

      {/* Time */}
      <TableCell className="px-4 py-2.5 whitespace-nowrap text-end">
        <time
          dateTime={log.created_at}
          title={fullDate}
          className="text-[11px] text-muted-foreground tabular-nums cursor-default"
        >
          {ago}
        </time>
      </TableCell>
    </TableRow>
  );
}

// ── Feed ──────────────────────────────────────────────────────────────────────

interface Props { logs: ActivityLog[] }

export default async function ActivityFeed({ logs }: Props) {
  const t = await getTranslations('activityLog');

  if (logs.length === 0) {
    return (
      // Fix #15: no emoji — use Lucide icon
      <div className="flex flex-col items-center justify-center py-16 text-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <History className="size-4 text-muted-foreground" />
        </span>
        <p className="text-[13px] font-semibold text-foreground">{t('empty')}</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <Table className="min-w-[640px]">
        <TableHeader>
          {/* Fix #18: use TableHead's built-in style, no inline font-black override */}
          <TableRow className="border-b border-border">
            {[t('colActor'), t('colAction'), t('colEntity'), t('colIp'), t('colTime')].map((h, i) => (
              <TableHead key={h} className={i === 4 ? 'text-end' : ''}>
                {h}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {logs.map((log) => (
            <LogRow key={log.id} log={log} />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
