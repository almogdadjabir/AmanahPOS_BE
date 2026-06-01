'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  RefreshCw,
  Server,
  Database,
  Zap,
  Cpu,
  Clock,
  HardDrive,
  Bell,
  BellOff,
  ScrollText,
  AlertTriangle,
  Activity,
  CheckCircle2,
  XCircle,
  AlertCircle,
  HelpCircle,
  Timer,
  Users,
  ShieldAlert,
  RotateCcw,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type {
  SystemOverview,
  SystemServices,
  SystemOperations,
  SystemWarning,
  ServiceStatus,
  OverallStatus,
  WarningSeverity,
} from '@/types/api';

// ── Constants ─────────────────────────────────────────────────────────────────

const SERVICE_META: {
  key: keyof SystemServices;
  icon: React.ReactNode;
  labelKey: string;
}[] = [
  { key: 'backend',     icon: <Server />,    labelKey: 'services.backend' },
  { key: 'database',    icon: <Database />,  labelKey: 'services.database' },
  { key: 'redis',       icon: <Zap />,       labelKey: 'services.redis' },
  { key: 'celery',      icon: <Cpu />,       labelKey: 'services.celery' },
  { key: 'celery_beat', icon: <Clock />,     labelKey: 'services.celery_beat' },
  { key: 'storage',     icon: <HardDrive />, labelKey: 'services.storage' },
];

function statusChipClass(status: ServiceStatus | undefined): string {
  switch (status) {
    case 'up':       return 'bg-success-light [&_svg]:text-success';
    case 'down':     return 'bg-danger-light [&_svg]:text-danger';
    case 'degraded': return 'bg-warning-light [&_svg]:text-warning';
    default:         return 'bg-muted [&_svg]:text-muted-foreground';
  }
}

function statusBadgeVariant(status: ServiceStatus | undefined) {
  switch (status) {
    case 'up':       return 'success' as const;
    case 'down':     return 'danger' as const;
    case 'degraded': return 'warning' as const;
    default:         return 'default' as const;
  }
}

function overallBadgeVariant(status: OverallStatus | undefined) {
  switch (status) {
    case 'healthy':  return 'success' as const;
    case 'degraded': return 'warning' as const;
    case 'critical': return 'danger' as const;
    default:         return 'default' as const;
  }
}

function warningSeverityVariant(severity: WarningSeverity) {
  switch (severity) {
    case 'critical': return 'danger' as const;
    case 'warning':  return 'warning' as const;
    default:         return 'info' as const;
  }
}

function StatusIcon({ status }: { status: ServiceStatus | undefined }) {
  const cls = 'size-3.5 shrink-0';
  switch (status) {
    case 'up':       return <CheckCircle2 className={cn(cls, 'text-success')} />;
    case 'down':     return <XCircle      className={cn(cls, 'text-danger')} />;
    case 'degraded': return <AlertCircle  className={cn(cls, 'text-warning')} />;
    default:         return <HelpCircle   className={cn(cls, 'text-muted-foreground')} />;
  }
}

// ── Service Card ──────────────────────────────────────────────────────────────

function ServiceCard({
  label,
  icon,
  status,
  message,
  responseMs,
  subLine,
}: {
  label: string;
  icon: React.ReactNode;
  status: ServiceStatus | undefined;
  message?: string;
  responseMs?: number | null;
  subLine?: string;
}) {
  const t = useTranslations('system');
  const statusLabel = t(`status.${status ?? 'unknown'}` as Parameters<typeof t>[0]);

  return (
    <div
      className={cn(
        'bg-card rounded-xl border border-border shadow-xs p-5 flex flex-col gap-3',
        'hover:shadow-card hover:-translate-y-px transition-[box-shadow,transform] duration-200 cursor-default',
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground leading-none pt-0.5 select-none">
          {label}
        </p>
        <span
          className={cn(
            'w-[32px] h-[32px] rounded-[9px] flex items-center justify-center shrink-0',
            '[&_svg]:size-[15px]',
            statusChipClass(status),
          )}
        >
          {icon}
        </span>
      </div>

      <div>
        <div className="flex items-center gap-1.5">
          <StatusIcon status={status} />
          <p className="text-[15px] font-semibold text-foreground leading-none">
            {statusLabel}
          </p>
          {responseMs != null && responseMs > 0 && (
            <span className="text-[10.5px] text-muted-foreground tabular-nums num ms-auto">
              {responseMs}ms
            </span>
          )}
        </div>
        {(subLine ?? message) && (
          <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug line-clamp-2">
            {subLine ?? message}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Queue Pill ────────────────────────────────────────────────────────────────

function QueuesPill({ queues }: { queues: Record<string, { pending: number }> }) {
  const t = useTranslations('system');
  const entries = Object.entries(queues);
  if (entries.length === 0) return null;

  return (
    <div className="bg-card rounded-xl border border-border shadow-xs p-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-[32px] h-[32px] rounded-[9px] bg-muted flex items-center justify-center [&_svg]:size-[15px] text-muted-foreground shrink-0">
          <Activity />
        </span>
        <p className="text-sm font-semibold text-foreground tracking-[-.015em]">{t('queues.title')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {entries.map(([name, q]) => (
          <div
            key={name}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12px] font-medium',
              q.pending > 0
                ? 'bg-warning-light border-warning/20 text-warning'
                : 'bg-muted border-border text-muted-foreground',
            )}
          >
            <span className="font-mono text-[11px]">{name}</span>
            <span className="text-[10px] opacity-70">·</span>
            <span className="tabular-nums">{q.pending}</span>
            <span className="text-[10.5px] opacity-70">{t('queues.pending')}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Operations Card ───────────────────────────────────────────────────────────

function OperationsCard({
  label,
  value,
  icon,
  iconClass,
  isNull,
}: {
  label: string;
  value: number | null | undefined;
  icon: React.ReactNode;
  iconClass: string;
  isNull?: boolean;
}) {
  const t = useTranslations('system');
  const fmt = new Intl.NumberFormat('en-US');
  const displayValue = isNull || value == null ? '—' : fmt.format(value);

  return (
    <div
      className={cn(
        'bg-card rounded-xl border border-border shadow-xs p-5 flex flex-col gap-3',
        'hover:shadow-card hover:-translate-y-px transition-[box-shadow,transform] duration-200 cursor-default',
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground leading-none pt-0.5 select-none">
          {label}
        </p>
        <span
          className={cn(
            'w-[32px] h-[32px] rounded-[9px] flex items-center justify-center shrink-0',
            '[&_svg]:size-[15px]',
            iconClass,
          )}
        >
          {icon}
        </span>
      </div>
      <div>
        <p className="text-[27px] font-semibold text-foreground leading-none tabular-nums tracking-[-.03em] num">
          {displayValue}
        </p>
        {isNull && (
          <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
            {t('operations.noData')}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Warnings ──────────────────────────────────────────────────────────────────

function WarningRow({ warning }: { warning: SystemWarning }) {
  const t = useTranslations('system');
  return (
    <div className={cn(
      'flex items-start gap-3 px-4 py-3.5 rounded-lg border',
      warning.severity === 'critical' && 'bg-danger-light border-danger/20',
      warning.severity === 'warning'  && 'bg-warning-light border-warning/20',
      warning.severity === 'info'     && 'bg-info-light border-info/20',
    )}>
      <ShieldAlert className={cn(
        'size-4 shrink-0 mt-0.5',
        warning.severity === 'critical' && 'text-danger',
        warning.severity === 'warning'  && 'text-warning',
        warning.severity === 'info'     && 'text-info',
      )} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-semibold text-foreground">{warning.title}</p>
          <Badge variant={warningSeverityVariant(warning.severity)} className="text-[10px]">
            {t(`warnings.severity.${warning.severity}` as Parameters<typeof t>[0])}
          </Badge>
        </div>
        <p className="text-[12px] text-muted-foreground mt-0.5">{warning.message}</p>
      </div>
    </div>
  );
}

// ── Refresh Controls ──────────────────────────────────────────────────────────

function RefreshControls({
  isPending,
  onRefresh,
  generatedAt,
}: {
  isPending: boolean;
  onRefresh: () => void;
  generatedAt?: string;
}) {
  const t = useTranslations('system');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (!autoRefresh) { setCountdown(30); return; }
    if (countdown === 0) { onRefresh(); setCountdown(30); return; }
    const id = setInterval(() => setCountdown(c => c - 1), 1000);
    return () => clearInterval(id);
  }, [autoRefresh, countdown, onRefresh]);

  useEffect(() => {
    if (!isPending && autoRefresh) setCountdown(30);
  }, [isPending, autoRefresh]);

  const timeLabel = generatedAt
    ? new Date(generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    : null;

  return (
    <div className="flex items-center gap-2 shrink-0">
      {timeLabel && (
        <span className="hidden sm:inline text-[11px] text-muted-foreground tabular-nums">
          {t('generatedAt')} {timeLabel}
        </span>
      )}

      {/* Auto-refresh toggle */}
      <button
        onClick={() => setAutoRefresh(a => !a)}
        className={cn(
          'h-[34px] px-3 rounded-lg text-[12px] font-[550] border transition-colors duration-150',
          autoRefresh
            ? 'bg-primary-tint border-primary/30 text-primary-700'
            : 'bg-card border-input text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        {autoRefresh ? `${countdown}s` : t('autoRefresh')}
      </button>

      {/* Manual refresh */}
      <button
        onClick={onRefresh}
        disabled={isPending}
        className={cn(
          'h-[34px] px-3 rounded-lg text-[12px] font-[550] border inline-flex items-center gap-1.5',
          'bg-card border-input text-muted-foreground',
          'hover:bg-muted hover:text-foreground',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          'transition-colors duration-150',
        )}
      >
        <RefreshCw className={cn('size-3.5', isPending && 'animate-spin')} />
        {isPending ? t('refreshing') : t('refresh')}
      </button>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────────────────────

export default function SystemHealthDashboard({
  overview,
  dateStr,
}: {
  overview: SystemOverview | null;
  dateStr: string;
}) {
  const t = useTranslations('system');
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleRefresh() {
    startTransition(() => router.refresh());
  }

  const overallStatus = overview?.overall_status;
  const services      = overview?.services;
  const operations    = overview?.operations;
  const warnings      = overview?.warnings ?? [];
  const queues        = services?.celery?.queues ?? {};

  return (
    <div className="space-y-4">

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-[21px] font-semibold text-foreground tracking-[-.025em] leading-tight">
              {t('title')}
            </h1>
            {overallStatus && (
              <Badge dot variant={overallBadgeVariant(overallStatus)} className="text-[11px]">
                {t(`overall.${overallStatus}` as Parameters<typeof t>[0])}
              </Badge>
            )}
          </div>
          <p className="text-[13px] text-muted-foreground mt-1">{dateStr}</p>
        </div>

        <RefreshControls
          isPending={isPending}
          onRefresh={handleRefresh}
          generatedAt={overview?.generated_at}
        />
      </div>

      {/* ── Failed-to-load state ─────────────────────────────────────────── */}
      {!overview && (
        <div className="bg-card rounded-xl border border-border shadow-xs p-8 flex flex-col items-center text-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
            <AlertTriangle className="size-5 text-muted-foreground" />
          </span>
          <div>
            <p className="text-[14px] font-semibold text-foreground">{t('failedToLoad')}</p>
            <p className="text-[12px] text-muted-foreground mt-1">{t('failedDesc')}</p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isPending}
            className="mt-1 h-[34px] px-4 rounded-lg text-[12px] font-[550] bg-muted border border-border text-muted-foreground hover:text-foreground hover:bg-muted/80 inline-flex items-center gap-1.5 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={cn('size-3.5', isPending && 'animate-spin')} />
            {t('refresh')}
          </button>
        </div>
      )}

      {/* ── Services Grid ────────────────────────────────────────────────── */}
      {services && (
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 select-none">
            {t('services.sectionTitle')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            {SERVICE_META.map(({ key, icon, labelKey }) => {
              const check = services[key];
              let subLine: string | undefined;
              if (key === 'celery' && check?.active_workers != null) {
                subLine = `${check.active_workers} worker${check.active_workers !== 1 ? 's' : ''}`;
              } else if (key === 'celery_beat' && check?.enabled_tasks != null) {
                subLine = `${check.enabled_tasks} task${check.enabled_tasks !== 1 ? 's' : ''} enabled`;
              } else if (key === 'storage' && check?.provider) {
                subLine = check.provider;
              }

              return (
                <ServiceCard
                  key={key}
                  label={t(labelKey as Parameters<typeof t>[0])}
                  icon={icon}
                  status={check?.status}
                  message={check?.message}
                  responseMs={check?.response_time_ms}
                  subLine={subLine}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* ── Celery Queues ────────────────────────────────────────────────── */}
      {Object.keys(queues).length > 0 && (
        <QueuesPill queues={queues} />
      )}

      {/* ── Operations Grid ──────────────────────────────────────────────── */}
      {operations && (
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-widest text-muted-foreground mb-3 select-none">
            {t('operations.sectionTitle')}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
            <OperationsCard
              label={t('operations.pendingNotifications')}
              value={operations.pending_notifications}
              icon={<Bell />}
              iconClass={
                (operations.pending_notifications ?? 0) > 100
                  ? 'bg-warning-light [&_svg]:text-warning'
                  : 'bg-muted [&_svg]:text-muted-foreground'
              }
            />
            <OperationsCard
              label={t('operations.failedNotifications')}
              value={operations.failed_notifications_24h}
              icon={<BellOff />}
              iconClass={
                (operations.failed_notifications_24h ?? 0) > 50
                  ? 'bg-danger-light [&_svg]:text-danger'
                  : 'bg-muted [&_svg]:text-muted-foreground'
              }
            />
            <OperationsCard
              label={t('operations.auditLogs')}
              value={operations.audit_logs_24h}
              icon={<ScrollText />}
              iconClass="bg-muted [&_svg]:text-muted-foreground"
            />
            <OperationsCard
              label={t('operations.errorLogs')}
              value={operations.error_logs_24h}
              icon={<AlertTriangle />}
              iconClass={
                (operations.error_logs_24h ?? 0) > 0
                  ? 'bg-danger-light [&_svg]:text-danger'
                  : 'bg-muted [&_svg]:text-muted-foreground'
              }
            />
            <OperationsCard
              label={t('operations.failedSync')}
              value={operations.failed_offline_sync_24h}
              isNull={operations.failed_offline_sync_24h == null}
              icon={<RotateCcw />}
              iconClass="bg-muted [&_svg]:text-muted-foreground"
            />
            <OperationsCard
              label={t('operations.failedTasks')}
              value={operations.failed_celery_tasks_24h}
              isNull={operations.failed_celery_tasks_24h == null}
              icon={<Timer />}
              iconClass="bg-muted [&_svg]:text-muted-foreground"
            />
          </div>
        </div>
      )}

      {/* ── Warnings ─────────────────────────────────────────────────────── */}
      <div className="bg-card rounded-xl border border-border shadow-xs overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <span className="w-[32px] h-[32px] rounded-[9px] bg-muted flex items-center justify-center [&_svg]:size-[15px] text-muted-foreground shrink-0">
              <ShieldAlert />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground tracking-[-.015em] leading-tight">
                {t('warnings.sectionTitle')}
              </p>
              {warnings.length > 0 && (
                <p className="text-[11px] text-muted-foreground mt-0.5">{warnings.length} active</p>
              )}
            </div>
          </div>
          {warnings.length > 0 && (
            <Badge variant="danger" className="text-[10px]">{warnings.length}</Badge>
          )}
        </div>

        <div className="p-4">
          {warnings.length === 0 ? (
            <div className="flex items-center gap-3 px-2 py-3">
              <CheckCircle2 className="size-4 text-success shrink-0" />
              <div>
                <p className="text-[13px] font-semibold text-foreground">{t('warnings.allClearTitle')}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{t('warnings.allClearDesc')}</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {warnings.map((w, i) => (
                <WarningRow key={`${w.code}-${i}`} warning={w} />
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
