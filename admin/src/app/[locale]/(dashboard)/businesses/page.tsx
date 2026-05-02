import { Suspense } from 'react';
import { fetchAdminBusinesses } from '@/services/admin';
import type { AdminBusiness } from '@/types/api';
import PageTitle from '@/components/ds/PageTitle';
import EmptyState from '@/components/ds/EmptyState';
import Badge from '@/components/ui/Badge';
import { TableSkeleton } from '@/components/ds/Skeleton';

async function BusinessesList() {
  let data;
  try {
    data = await fetchAdminBusinesses({ page_size: 50 });
  } catch {
    return (
      <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-6 text-center">
        <p className="text-[13px] font-semibold text-danger">Failed to load businesses</p>
        <p className="text-xs text-danger/70 mt-1">Check API connection and refresh.</p>
      </div>
    );
  }

  if (data.results.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border-soft shadow-card">
        <EmptyState
          icon={<StoreIcon />}
          title="No businesses yet"
          description="Businesses will appear here once owners create them."
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-border-soft shadow-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border-soft bg-surface-soft">
        <p className="text-[11px] font-semibold text-text-hint uppercase tracking-wider">
          {data.count} business{data.count !== 1 ? 'es' : ''}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-soft">
              {['Business', 'Owner', 'Shops', 'Subscription', 'Status', 'Created'].map(h => (
                <th key={h} className="text-start px-4 py-2.5 text-[11px] font-semibold text-text-hint uppercase tracking-wider last:text-end">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {data.results.map(biz => <BizRow key={biz.id} biz={biz} />)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function BizRow({ biz }: { biz: AdminBusiness }) {
  const created = new Date(biz.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const endDate = biz.subscription_end_date
    ? new Date(biz.subscription_end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;
  return (
    <tr className="hover:bg-surface-soft transition-colors">
      <td className="px-4 py-3">
        <p className="text-[13px] font-semibold text-text-primary">{biz.name}</p>
        <p className="text-[11px] text-text-hint font-mono">{biz.slug}</p>
      </td>
      <td className="px-4 py-3">
        <p className="text-[13px] text-text-primary">{biz.owner_name || '—'}</p>
        <p className="text-[11px] font-mono text-text-hint">{biz.owner_phone}</p>
      </td>
      <td className="px-4 py-3 text-[13px] text-text-secondary">{biz.shop_count}</td>
      <td className="px-4 py-3">
        {biz.has_active_subscription ? (
          <div>
            <Badge dot variant="success">Active</Badge>
            {endDate && <p className="text-[11px] text-text-hint mt-0.5">until {endDate}</p>}
          </div>
        ) : (
          <Badge dot variant="warning">No plan</Badge>
        )}
      </td>
      <td className="px-4 py-3">
        <Badge dot variant={biz.is_active ? 'success' : 'danger'}>
          {biz.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </td>
      <td className="px-4 py-3 text-xs text-text-hint text-end">{created}</td>
    </tr>
  );
}

export default function BusinessesPage() {
  return (
    <div>
      <PageTitle
        title="Businesses"
        description="All businesses registered across the platform."
      />
      <Suspense fallback={<TableSkeleton rows={8} cols={6} />}>
        <BusinessesList />
      </Suspense>
    </div>
  );
}

function StoreIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
