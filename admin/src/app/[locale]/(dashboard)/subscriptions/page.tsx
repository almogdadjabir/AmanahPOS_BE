import { Suspense } from 'react';
import { fetchAdminSubscriptions } from '@/services/admin';
import type { AdminSubscription } from '@/types/api';
import PageTitle from '@/components/ds/PageTitle';
import EmptyState from '@/components/ds/EmptyState';
import Badge from '@/components/ui/Badge';
import { TableSkeleton } from '@/components/ds/Skeleton';

async function SubscriptionsList({ status }: { status?: string }) {
  let data;
  try {
    const s = (status === 'active' || status === 'expired') ? status : 'all';
    data = await fetchAdminSubscriptions({ status: s, page_size: 50 });
  } catch {
    return (
      <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-6 text-center">
        <p className="text-[13px] font-semibold text-danger">Failed to load subscriptions</p>
        <p className="text-xs text-danger/70 mt-1">Check API connection and refresh.</p>
      </div>
    );
  }

  if (data.results.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border-soft shadow-card">
        <EmptyState
          icon={<CreditIcon />}
          title="No subscriptions found"
          description="Subscriptions will appear here once owners subscribe to a plan."
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-border-soft shadow-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border-soft bg-surface-soft">
        <p className="text-[11px] font-semibold text-text-hint uppercase tracking-wider">
          {data.count} subscription{data.count !== 1 ? 's' : ''}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-soft">
              {['Business', 'Owner', 'Plan', 'Period', 'Status', 'Days Left'].map(h => (
                <th key={h} className="text-start px-4 py-2.5 text-[11px] font-semibold text-text-hint uppercase tracking-wider last:text-end">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {data.results.map(sub => <SubRow key={sub.id} sub={sub} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SubRow({ sub }: { sub: AdminSubscription }) {
  const start = new Date(sub.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const end   = new Date(sub.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const price = parseFloat(sub.plan_price);

  return (
    <tr className="hover:bg-surface-soft transition-colors">
      <td className="px-4 py-3 text-[13px] font-semibold text-text-primary">{sub.business_name}</td>
      <td className="px-4 py-3">
        <p className="text-[13px] text-text-primary">{sub.owner_name || '—'}</p>
        <p className="text-[11px] font-mono text-text-hint">{sub.owner_phone}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-[13px] font-semibold text-text-primary">{sub.plan_name}</p>
        <p className="text-[11px] text-text-hint">{price === 0 ? 'Free' : `${price} ${sub.plan_currency}`}</p>
      </td>
      <td className="px-4 py-3 text-[12px] text-text-secondary">
        {start} → {end}
      </td>
      <td className="px-4 py-3">
        <Badge dot variant={sub.is_expired ? 'danger' : sub.is_active ? 'success' : 'warning'}>
          {sub.is_expired ? 'Expired' : sub.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </td>
      <td className="px-4 py-3 text-end">
        <span className={`text-[13px] font-bold ${sub.is_expired ? 'text-danger' : sub.days_remaining <= 7 ? 'text-warning' : 'text-success'}`}>
          {sub.is_expired ? '0' : sub.days_remaining}d
        </span>
      </td>
    </tr>
  );
}

export default function SubscriptionsPage() {
  return (
    <div>
      <PageTitle
        title="Subscriptions"
        description="All subscriptions across the platform."
      />

      {/* Status filter tabs */}
      <div className="flex gap-2 mb-4">
        {(['all', 'active', 'expired'] as const).map(s => (
          <a
            key={s}
            href={s === 'all' ? '?' : `?status=${s}`}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border-soft bg-white text-text-secondary hover:bg-surface-soft transition-colors capitalize"
          >
            {s}
          </a>
        ))}
      </div>

      <Suspense fallback={<TableSkeleton rows={8} cols={6} />}>
        <SubscriptionsList />
      </Suspense>
    </div>
  );
}

function CreditIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>; }
