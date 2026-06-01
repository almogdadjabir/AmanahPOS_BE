import { Calendar, Clock, CreditCard, PhoneCall, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Subscription } from '@/types/api';
import type { SubscriptionStatus } from '@/lib/subscription-utils';

interface Props {
  sub:    Subscription;
  status: SubscriptionStatus;
}

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

// Subtle background wash by status — inside the card, not a border accent
const WASH_CLASSES: Record<SubscriptionStatus, string> = {
  active:        'from-primary/[0.05] via-primary/[0.02] to-transparent',
  expiring_soon: 'from-warning/[0.07] via-warning/[0.03] to-transparent',
  expired:       'from-danger/[0.06] via-danger/[0.02] to-transparent',
  inactive:      'from-danger/[0.06] via-danger/[0.02] to-transparent',
  demo:          'from-warning/[0.07] via-warning/[0.03] to-transparent',
  none:          'from-muted/60 via-muted/20 to-transparent',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

export default function SubscriptionHeroCard({ sub, status }: Props) {
  const cfg    = STATUS_CONFIG[status];
  const price  = parseFloat(sub.plan.price);
  const isGood = status === 'active' || status === 'expiring_soon';

  return (
    // Fix #5: no top accent bar — border + shadow-xs only
    <div className="relative rounded-xl border border-border bg-card shadow-xs overflow-hidden mb-4">
      {/* Subtle status wash — not a border, just an atmosphere tint */}
      <div className={cn('absolute inset-0 bg-gradient-to-br pointer-events-none', WASH_CLASSES[status])} />

      <div className="relative p-5">
        {/* Row 1: plan identity + status badge */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="min-w-0">
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mb-1 select-none">
              Current Plan
            </p>
            <h2 className="text-[20px] font-semibold text-foreground leading-tight tracking-[-.02em] truncate">
              {sub.plan.name}
            </h2>
            {sub.plan.description && (
              <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">
                {sub.plan.description}
              </p>
            )}
          </div>
          <Badge dot variant={cfg.variant} className="shrink-0 mt-0.5">
            {cfg.label}
          </Badge>
        </div>

        {/* Row 2: metric tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">

          {/* Days remaining */}
          <div className={cn(
            'rounded-xl p-4',
            isGood
              ? 'bg-primary-tint border border-primary/15'
              : 'bg-muted/50 border border-border/60',
          )}>
            <div className="flex items-center gap-1.5 mb-2">
              <Clock size={11} className={isGood ? 'text-primary/70' : 'text-muted-foreground/60'} />
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70 select-none">
                Remaining
              </p>
            </div>
            {status === 'expired' || status === 'inactive' ? (
              <p className="text-[15px] font-semibold text-danger">Expired</p>
            ) : (
              <p className={cn(
                'text-[22px] font-semibold tabular-nums leading-none num',
                sub.days_remaining <= 7 ? 'text-warning' : isGood ? 'text-primary' : 'text-foreground',
              )}>
                {sub.days_remaining}
                <span className="text-[12px] font-medium text-muted-foreground ms-1">days</span>
              </p>
            )}
          </div>

          {/* Expiry */}
          <div className="rounded-xl bg-muted/40 border border-border/50 p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <Calendar size={11} className="text-muted-foreground/60" />
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70 select-none">
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
              <Calendar size={11} className="text-muted-foreground/60" />
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70 select-none">
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
              <CreditCard size={11} className="text-muted-foreground/60" />
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70 select-none">
                Price
              </p>
            </div>
            <p className="text-[13px] font-semibold text-foreground leading-snug">
              {price === 0
                ? <span className="text-warning">Demo</span>
                : `${price.toLocaleString('en-US')} ${sub.plan.currency}`
              }
            </p>
          </div>
        </div>

        {/* Renew notice (non-active states) */}
        {status !== 'active' && (
          <div className="mt-4 pt-4 border-t border-border/50 flex items-center gap-2.5">
            <span className="w-[28px] h-[28px] rounded-[9px] bg-muted flex items-center justify-center shrink-0 [&_svg]:size-[13px] text-muted-foreground">
              <PhoneCall />
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

export function NoSubscriptionCard() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden mb-4">
      <div className="p-10 flex flex-col items-center text-center">
        <span className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
          <Sparkles size={20} className="text-muted-foreground/60" />
        </span>
        <h3 className="text-[16px] font-semibold text-foreground mb-2">No active subscription</h3>
        <p className="text-[13px] text-muted-foreground max-w-sm leading-relaxed">
          You don&apos;t have an active subscription. Contact your platform administrator to get started.
        </p>
        <div className="flex items-center gap-2 mt-5 px-4 py-2.5 rounded-xl bg-muted/60 border border-border">
          <PhoneCall size={13} className="text-muted-foreground" />
          <span className="text-[13px] text-muted-foreground font-semibold">Contact platform support</span>
        </div>
      </div>
    </div>
  );
}
