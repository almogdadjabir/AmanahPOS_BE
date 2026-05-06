import EmptyState from '@/components/ds/EmptyState';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { AdminPlan } from './types';
import { CreditCard, Users as UsersIcon, Store, Clock } from 'lucide-react';

type Props = { plans: AdminPlan[] };

export default function AdminSubscriptionPlans({ plans }: Props) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center [&_svg]:size-3.5">
            <CreditCard />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground">Subscription Plans</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Plans available on the platform</p>
          </div>
        </div>
        <Badge variant={plans.length > 0 ? 'success' : 'default'} dot>
          {plans.length} {plans.length === 1 ? 'plan' : 'plans'}
        </Badge>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          icon={<CreditCard />}
          title="No plans configured"
          description="Add subscription plans from the Django admin panel."
        />
      ) : (
        <div className="divide-y divide-border/60">
          {plans.map(plan => <PlanRow key={plan.id} plan={plan} />)}
        </div>
      )}
    </div>
  );
}

function PlanRow({ plan }: { plan: AdminPlan }) {
  const price    = Number.parseFloat(plan.price);
  const isFree   = price === 0 || plan.is_free;
  const priceStr = isFree ? 'Free' : `${price} ${plan.currency}`;

  return (
    <div className="px-5 py-3.5 flex items-center gap-4 hover:bg-muted/30 transition-colors">
      {/* Name + badges */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <p className="text-[13px] font-bold text-foreground">{plan.name}</p>
          {isFree      && <Badge variant="info"    className="text-[10px]">Free</Badge>}
          {!plan.is_active && <Badge variant="danger"  className="text-[10px]">Inactive</Badge>}
        </div>
        {plan.description && (
          <p className="text-[11px] text-muted-foreground truncate max-w-xs">{plan.description}</p>
        )}
      </div>

      {/* Limits */}
      <div className="hidden md:flex items-center gap-3">
        <LimitChip icon={<Clock />}      label={`${plan.duration_days}d`} />
        <LimitChip icon={<Store />}      label={`${plan.max_shops} shops`} />
        <LimitChip icon={<UsersIcon />}  label={`${plan.max_users} users`} />
      </div>

      {/* Price */}
      <div className="text-end shrink-0">
        <p className={cn(
          'text-[14px] font-black tabular-nums',
          isFree ? 'text-success' : 'text-foreground',
        )}>
          {priceStr}
        </p>
        {!isFree && (
          <p className="text-[10px] text-muted-foreground mt-0.5">/ {plan.duration_days} days</p>
        )}
      </div>
    </div>
  );
}

function LimitChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground [&_svg]:size-3">
      {icon}
      {label}
    </span>
  );
}
