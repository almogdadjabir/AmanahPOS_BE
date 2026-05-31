import { Calendar, Clock, CreditCard, PhoneCall, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import type { Subscription } from '@/types/api';
import type { SubscriptionStatus } from '@/lib/subscription-utils';

interface Props {
  sub:    Subscription;
  status: SubscriptionStatus;
}

// ── Config ────────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SubscriptionStatus, {
  label:   string;
  variant: 'success' | 'warning' | 'danger' | 'info' | 'default';
}> = {
  active:        { label: 'Active',        variant: 'success' },
  expiring_soon: { label: 'Expiring Soon', variant: 'warning' },
  expired:       { label: 'Expired',       variant: 'danger'  },
  inactive:      { label: 'Inactive',      variant: 'danger'  },
  demo:          { label: 'Demo',          variant: 'warning' },
  none:          { label: 'No Plan',       variant: 'default' },
};

// Gradient washes behind the plan name area — subtle tinted bg
const WASH_CLASSES: Record<SubscriptionStatus, string> = {
  active:        'from-primary/[0.06] via-primary/[0.03] to-transparent',
  expiring_soon: 'from-amber-500/[0.08] via-amber-500/[0.04] to-transparent',
  expired:       'from-destructive/[0.07] via-destructive/[0.03] to-transparent',
  inactive:      'from-destructive/[0.07] via-destructive/[0.03] to-transparent',
  demo:          'from-amber-500/[0.08] via-amber-500/[0.04] to-transparent',
  none:          'from-muted/60 via-muted/20 to-transparent',
};

// Top border accent
const ACCENT_CLASSES: Record<SubscriptionStatus, string> = {
  active:        'bg-gradient-to-r from-primary via-teal-400 to-primary/40',
  expiring_soon: 'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400/40',
  expired:       'bg-gradient-to-r from-destructive via-rose-500 to-destructive/40',
  inactive:      'bg-gradient-to-r from-destructive via-rose-500 to-destructive/40',
  demo:          'bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400/40',
  none:          'bg-gradient-to-r from-muted-foreground/30 to-muted-foreground/10',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

// ── Main card ─────────────────────────────────────────────────────────────────

export default function SubscriptionHeroCard({ sub, status }: Props) {
  const cfg    = STATUS_CONFIG[status];
  const price  = parseFloat(sub.plan.price);
  const isGood = status === 'active' || status === 'expiring_soon';

  return (
    <div className="relative rounded-xl border border-border bg-card shadow-card overflow-hidden mb-5">
      {/* Top accent line */}
      <div className={`h-[3px] w-full ${ACCENT_CLASSES[status]}`} />

      {/* Gradient wash — top-left corner behind plan name */}
      <div className={`absolute inset-0 bg-gradient-to-br ${WASH_CLASSES[status]} pointer-events-none`} />

      <div className="relative p-6">
        {/* ── Row 1: plan identity + status ── */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-muted-foreground/60">
                Current Plan
              </p>
            </div>
            <h2 className="text-2xl font-bold text-foreground leading-tight tracking-tight truncate">
              {sub.plan.name}
            </h2>
            {sub.plan.description && (
              <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                {sub.plan.description}
              </p>
            )}
          </div>

          <Badge dot variant={cfg.variant} className="shrink-0 mt-1 text-[12px] px-3 py-1">
            {cfg.label}
          </Badge>
        </div>

        {/* ── Row 2: metric tiles ── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Days remaining — hero tile */}
          <div className={`relative rounded-xl p-4 overflow-hidden
            ${isGood
              ? 'bg-primary/[0.07] border border-primary/20'
              : 'bg-muted/50 border border-border/60'
            }`}
          >
            <div className="flex items-center gap-1.5 mb-2">
              <Clock size={12} className={isGood ? 'text-primary/70' : 'text-muted-foreground/60'} />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
                Remaining
              </p>
            </div>
            {status === 'expired' || status === 'inactive' ? (
              <p className="text-lg font-bold text-destructive">Expired</p>
            ) : (
              <p className={`text-2xl font-bold tabular-nums leading-none ${
                sub.days_remaining <= 7 ? 'text-amber-600' : isGood ? 'text-primary' : 'text-foreground'
              }`}>
                {sub.days_remaining}
                <span className="text-sm font-semibold text-muted-foreground ml-1">days</span>
              </p>
            )}
          </div>

          {/* Expiry */}
          <div className="rounded-xl bg-muted/40 border border-border/50 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar size={12} className="text-muted-foreground/60" />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
                Expires
              </p>
            </div>
            <p className="text-[13px] font-semibold text-foreground leading-snug">
              {fmtDate(sub.end_date)}
            </p>
          </div>

          {/* Started */}
          <div className="rounded-xl bg-muted/40 border border-border/50 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar size={12} className="text-muted-foreground/60" />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
                Started
              </p>
            </div>
            <p className="text-[13px] font-semibold text-foreground leading-snug">
              {fmtDate(sub.start_date)}
            </p>
          </div>

          {/* Price */}
          <div className="rounded-xl bg-muted/40 border border-border/50 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <CreditCard size={12} className="text-muted-foreground/60" />
              <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground/60">
                Price
              </p>
            </div>
            <p className="text-[13px] font-semibold text-foreground leading-snug">
              {price === 0
                ? <span className="text-amber-600">Demo</span>
                : `${price.toLocaleString()} ${sub.plan.currency}`
              }
            </p>
          </div>
        </div>

        {/* ── Renew notice (non-active states) ── */}
        {(status !== 'active') && (
          <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2.5">
            <span className="w-6 h-6 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <PhoneCall size={12} className="text-muted-foreground" />
            </span>
            <p className="text-[12px] text-muted-foreground">
              {status === 'demo'
                ? 'Contact your platform administrator to activate a paid plan.'
                : 'Contact your platform administrator to renew your subscription.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Empty state ───────────────────────────────────────────────────────────────

export function NoSubscriptionCard() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden mb-5">
      <div className="h-[3px] bg-gradient-to-r from-muted-foreground/30 to-transparent" />
      <div className="p-10 flex flex-col items-center text-center">
        <span className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center mb-4">
          <Sparkles size={22} className="text-muted-foreground/60" />
        </span>
        <h3 className="text-lg font-bold text-foreground mb-2">No active subscription</h3>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          You don&apos;t have an active subscription. Contact your platform administrator to get started.
        </p>
        <div className="flex items-center gap-2 mt-6 px-4 py-2.5 rounded-xl bg-muted/60 border border-border">
          <PhoneCall size={13} className="text-muted-foreground" />
          <span className="text-sm text-muted-foreground font-semibold">Contact platform support</span>
        </div>
      </div>
    </div>
  );
}
