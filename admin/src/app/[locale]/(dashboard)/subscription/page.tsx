import { apiGet } from '@/lib/api';
import type { Subscription, Plan } from '@/types/api';
import PageTitle from '@/components/ds/PageTitle';
import EmptyState from '@/components/ds/EmptyState';
import Badge from '@/components/ui/Badge';

async function fetchSubscription(): Promise<Subscription | null> {
  try {
    return await apiGet<Subscription>('/api/v1/subscriptions/my/');
  } catch {
    return null;
  }
}

async function fetchPlans(): Promise<Plan[]> {
  try {
    const res = await apiGet<Plan[]>('/api/v1/subscriptions/plans/');
    return Array.isArray(res) ? res : [];
  } catch {
    return [];
  }
}

export default async function SubscriptionPage() {
  const [sub, plans] = await Promise.all([fetchSubscription(), fetchPlans()]);

  function fmtDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  }

  return (
    <div>
      <PageTitle
        title="My Subscription"
        description="Your current plan and billing details."
      />

      {/* Current plan */}
      {sub ? (
        <div className="bg-white rounded-xl border border-border-soft shadow-card p-5 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium text-text-hint mb-1">Current Plan</p>
              <p className="text-[18px] font-bold text-text-primary">{sub.plan.name}</p>
              <p className="text-xs text-text-hint mt-1">{sub.plan.description}</p>
            </div>
            <Badge variant={sub.is_expired ? 'danger' : sub.days_remaining <= 7 ? 'warning' : 'success'} dot>
              {sub.is_expired ? 'Expired' : `${sub.days_remaining}d left`}
            </Badge>
          </div>

          <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Start Date',  value: fmtDate(sub.start_date) },
              { label: 'End Date',    value: fmtDate(sub.end_date) },
              { label: 'Max Shops',   value: String(sub.plan.max_shops) },
              { label: 'Max Users',   value: String(sub.plan.max_users) },
            ].map(item => (
              <div key={item.label} className="bg-surface-soft rounded-lg p-3">
                <p className="text-[11px] font-medium text-text-hint mb-1">{item.label}</p>
                <p className="text-[13px] font-semibold text-text-primary">{item.value}</p>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-border-soft shadow-card mb-4">
          <EmptyState
            icon={<CreditIcon />}
            title="No active subscription"
            description="Contact your platform administrator to activate a subscription plan."
          />
        </div>
      )}

      {/* Available plans */}
      {plans.length > 0 && (
        <div className="bg-white rounded-xl border border-border-soft shadow-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border-soft">
            <p className="text-[13px] font-semibold text-text-primary">Available Plans</p>
            <p className="text-xs text-text-hint mt-0.5">Plans offered on this platform</p>
          </div>
          <div className="divide-y divide-border-soft">
            {plans.map(plan => {
              const price = parseFloat(plan.price);
              const isCurrent = sub?.plan.id === plan.id;
              return (
                <div key={plan.id} className={`px-4 py-3 flex items-center gap-4 ${isCurrent ? 'bg-primary/[0.03]' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[13px] font-semibold text-text-primary">{plan.name}</p>
                      {plan.is_free && <Badge variant="info">Free</Badge>}
                      {isCurrent && <Badge variant="success">Current</Badge>}
                      {!plan.is_active && <Badge variant="danger">Inactive</Badge>}
                    </div>
                    <p className="text-xs text-text-hint mt-0.5 truncate">{plan.description}</p>
                  </div>
                  <div className="text-end shrink-0">
                    <p className="text-[13px] font-bold text-text-primary">
                      {price === 0 ? 'Free' : `${price} ${plan.currency}`}
                    </p>
                    <p className="text-[11px] text-text-hint">{plan.duration_days}d · {plan.max_shops} shops</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function CreditIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>; }
