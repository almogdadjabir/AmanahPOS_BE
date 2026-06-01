import { Users, Package, Store, UserCheck, AlertTriangle, Infinity as InfinityIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { OwnerUsage } from '@/actions/my-subscription';
import type { Plan } from '@/types/api';

interface Props {
  usage: OwnerUsage;
  plan:  Plan;
}

// DS token colors — no raw amber/destructive
function getBarColor(pct: number) {
  if (pct >= 100) return {
    bar:  'bg-danger',
    text: 'text-danger',
    bg:   'bg-danger-light border-danger/20',
  };
  if (pct >= 80) return {
    bar:  'bg-warning',
    text: 'text-warning',
    bg:   'bg-warning-light border-warning/20',
  };
  return {
    bar:  'bg-primary',
    text: 'text-primary',
    bg:   'bg-primary-tint border-primary/15',
  };
}

interface MetricCardProps {
  icon:    React.ReactNode;
  label:   string;
  current: number;
  max:     number;
}

function MetricCard({ icon, label, current, max }: MetricCardProps) {
  const pct    = max > 0 ? Math.min(100, Math.round((current / max) * 100)) : 0;
  const colors = getBarColor(pct);
  const isOver = pct >= 100;
  const isNear = pct >= 80 && pct < 100;

  return (
    <div className={cn('rounded-xl border p-4 flex flex-col gap-3 transition-colors', colors.bg)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn('[&_svg]:size-[13px]', colors.text)}>{icon}</span>
          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/70 select-none">
            {label}
          </p>
        </div>
        {(isOver || isNear) && (
          <span className={cn('flex items-center gap-1 text-[10px] font-semibold shrink-0', colors.text)}>
            <AlertTriangle size={10} />
            {isOver ? 'Limit' : 'Near'}
          </span>
        )}
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className={cn('text-[26px] font-semibold tabular-nums leading-none num', colors.text)}>
          {current.toLocaleString('en-US')}
        </span>
        <span className="text-[13px] font-medium text-muted-foreground/60">
          / {max.toLocaleString('en-US')}
        </span>
      </div>

      <div className="space-y-1">
        <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-700', colors.bar)}
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className={cn('text-[11px] font-semibold tabular-nums num', colors.text)}>
          {pct}% used
        </p>
      </div>
    </div>
  );
}

function UnlimitedCard({ icon, label, current }: { icon: React.ReactNode; label: string; current: number }) {
  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-4 flex flex-col gap-3">
      <div className="flex items-center gap-2">
        <span className="[&_svg]:size-[13px] text-muted-foreground/60">{icon}</span>
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/60 select-none">
          {label}
        </p>
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-[26px] font-semibold tabular-nums text-foreground leading-none num">
          {current.toLocaleString('en-US')}
        </span>
        <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground bg-background border border-border/60 px-2 py-0.5 rounded-full">
          <InfinityIcon size={10} />
          Unlimited
        </span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
        <div className="h-full w-full rounded-full bg-gradient-to-r from-primary/20 to-primary/10" />
      </div>
    </div>
  );
}

export default function SubscriptionUsage({ usage, plan }: Props) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-xs p-5">
      <p className="text-[11.5px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 select-none">
        Usage &amp; Limits
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <MetricCard icon={<Users />}   label="Staff"    current={usage.current_staff}    max={plan.max_users} />
        <MetricCard icon={<Package />} label="Products" current={usage.current_products} max={plan.max_products} />
        {usage.current_shops !== null ? (
          <MetricCard icon={<Store />} label="Shops" current={usage.current_shops} max={plan.max_shops} />
        ) : (
          <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 flex items-center gap-3">
            <Store size={13} className="text-muted-foreground/40 shrink-0" />
            <div>
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/50 select-none">Shops</p>
              <p className="text-[13px] font-semibold text-muted-foreground/60 mt-0.5">Up to {plan.max_shops}</p>
            </div>
          </div>
        )}
        <UnlimitedCard icon={<UserCheck />} label="Customers" current={usage.current_customers} />
      </div>
    </div>
  );
}

export function UsageUnavailable({ plan }: { plan: Plan }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-xs p-5">
      <p className="text-[11.5px] font-semibold uppercase tracking-widest text-muted-foreground mb-4 select-none">
        Plan Limits
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { icon: <Users />,   label: 'Max Staff',    value: plan.max_users    },
          { icon: <Package />, label: 'Max Products', value: plan.max_products },
          { icon: <Store />,   label: 'Max Shops',    value: plan.max_shops    },
        ].map(item => (
          <div key={item.label} className="rounded-xl bg-muted/40 border border-border/50 p-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="[&_svg]:size-[13px] text-muted-foreground/60">{item.icon}</span>
              <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground/60 select-none">
                {item.label}
              </p>
            </div>
            <p className="text-[22px] font-semibold tabular-nums text-foreground num">{item.value}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
