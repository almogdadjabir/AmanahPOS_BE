import { fetchAdminPlans } from '@/services/admin';
import { ApiError } from '@/lib/api';
import type { AdminPlan } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/ds/EmptyState';
import ViewPlanButton from './ViewPlanButton';
import { Package, Store, ShoppingBag, Users, Clock, CreditCard } from 'lucide-react';
import { cn } from '@/lib/utils';

export default async function PlansList() {
  let plans: AdminPlan[];

  try {
    plans = await fetchAdminPlans();
  } catch (err) {
    const httpStatus = err instanceof ApiError ? err.status : null;
    const body       = err instanceof ApiError ? JSON.stringify(err.body) : String(err);
    console.error('[PlansList] fetch failed', { httpStatus, body });
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-10 text-center">
        <p className="text-sm font-semibold text-destructive">Failed to load plans</p>
        <p className="text-xs text-destructive/70 mt-1">
          {httpStatus ? `HTTP ${httpStatus}` : 'Network error'} — check server logs for details.
        </p>
        {process.env.NODE_ENV === 'development' && (
          <pre className="mt-3 text-left text-[10px] bg-destructive/10 rounded p-2 overflow-x-auto text-destructive/80 max-h-32">
            {body}
          </pre>
        )}
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
        <EmptyState
          icon={<Package />}
          title="No plans yet"
          description="Create the first subscription plan to get started."
        />
      </div>
    );
  }

  const paidPlans = plans.filter(p => !p.is_free);
  const demoPlans = plans.filter(p =>  p.is_free);

  return (
    <div className="space-y-6">
      {paidPlans.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-md bg-success/10 text-success flex items-center justify-center [&_svg]:size-3">
              <Package />
            </span>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
              Paid Plans · {paidPlans.length}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paidPlans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
          </div>
        </section>
      )}

      {demoPlans.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-md bg-info/10 text-info flex items-center justify-center [&_svg]:size-3">
              <Package />
            </span>
            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
              Demo Access · {demoPlans.length}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {demoPlans.map(plan => <PlanCard key={plan.id} plan={plan} />)}
          </div>
        </section>
      )}
    </div>
  );
}

function PlanCard({ plan }: { plan: AdminPlan }) {
  const price = parseFloat(plan.price);

  return (
    <div className={cn(
      'group relative rounded-2xl border bg-card shadow-card overflow-hidden transition-shadow hover:shadow-md',
      plan.is_active ? 'border-border' : 'border-border/40 opacity-60',
    )}>
      {/* Top accent bar */}
      <div className={cn(
        'h-1 w-full',
        plan.is_free
          ? 'bg-gradient-to-r from-info/60 to-info/20'
          : plan.is_active
          ? 'bg-gradient-to-r from-success/60 to-success/20'
          : 'bg-muted',
      )} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className={cn(
              'w-9 h-9 rounded-xl flex items-center justify-center shrink-0',
              plan.is_free ? 'bg-info/10' : plan.is_active ? 'bg-success/10' : 'bg-muted',
            )}>
              <Package size={16} className={
                plan.is_free ? 'text-info' : plan.is_active ? 'text-success' : 'text-muted-foreground'
              } />
            </div>
            <div className="min-w-0">
              <p className="text-[14px] font-bold text-foreground truncate leading-tight">{plan.name}</p>
              {plan.description && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">{plan.description}</p>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge dot variant={plan.is_active ? 'success' : 'warning'}>
              {plan.is_active ? 'Active' : 'Off'}
            </Badge>
            {plan.is_free && <Badge variant="info" className="text-[9px]">Demo</Badge>}
          </div>
        </div>

        {/* Price */}
        <div className={cn(
          'rounded-xl px-3 py-2.5 mb-3',
          plan.is_free ? 'bg-info/5 border border-info/10' : 'bg-success/5 border border-success/10',
        )}>
          {plan.is_free ? (
            <p className="text-[13px] font-bold text-info">Free / Demo</p>
          ) : (
            <div className="flex items-baseline gap-1">
              <p className="text-[22px] font-black text-success leading-none tabular-nums">
                {price % 1 === 0 ? price.toFixed(0) : price.toFixed(2)}
              </p>
              <p className="text-[11px] font-semibold text-muted-foreground">
                {plan.currency} / {plan.duration_days}d
              </p>
            </div>
          )}
        </div>

        {/* Limits */}
        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <LimitBadge icon={<Store size={10} />}       label="Shops"    value={plan.max_shops} />
          <LimitBadge icon={<ShoppingBag size={10} />} label="Products" value={plan.max_products} />
          <LimitBadge icon={<Users size={10} />}       label="Users"    value={plan.max_users} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock size={10} />
              <span>{plan.duration_days}d</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <CreditCard size={10} />
              <span>{plan.subscription_count} sub{plan.subscription_count !== 1 ? 's' : ''}</span>
            </div>
          </div>
          <ViewPlanButton planId={plan.id} />
        </div>
      </div>
    </div>
  );
}

function LimitBadge({
  icon, label, value,
}: {
  icon:  React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg border border-border bg-muted/20 px-2 py-1.5">
      <div className="flex items-center gap-1 text-muted-foreground">{icon}</div>
      <p className="text-[12px] font-bold text-foreground">{value}</p>
      <p className="text-[9px] text-muted-foreground uppercase tracking-[0.05em]">{label}</p>
    </div>
  );
}
