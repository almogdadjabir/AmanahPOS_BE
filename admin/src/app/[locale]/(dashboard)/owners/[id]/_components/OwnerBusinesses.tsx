import type { AdminOwnerBusiness } from '@/types/api';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/ds/EmptyState';

export default function OwnerBusinesses({ businesses }: { businesses: AdminOwnerBusiness[] }) {
  if (businesses.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border shadow-card">
        <EmptyState
          icon={<StoreIcon />}
          title="No businesses yet"
          description="This owner hasn't created any businesses."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {businesses.map(biz => <BusinessCard key={biz.id} biz={biz} />)}
    </div>
  );
}

function BusinessCard({ biz }: { biz: AdminOwnerBusiness }) {
  const created = new Date(biz.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="bg-white rounded-xl border border-border shadow-card overflow-hidden">
      {/* Business header */}
      <div className="px-4 py-3.5 flex items-start justify-between gap-3 border-b border-border">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar */}
          <div className="w-9 h-9 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
            <span className="text-[13px] font-black text-primary uppercase">
              {biz.name.charAt(0)}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-foreground truncate">{biz.name}</p>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{biz.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge dot variant={biz.is_active ? 'success' : 'danger'}>
            {biz.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <span className="text-[11px] text-muted-foreground">{created}</span>
        </div>
      </div>

      {/* Subscription + shops stats */}
      <div className="px-4 py-3 flex items-center gap-6 flex-wrap">
        {/* Subscription */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Subscription
          </p>
          {biz.active_subscription ? (
            <div className="flex items-center gap-2">
              <Badge dot variant="success">{biz.active_subscription.plan_name}</Badge>
              <span className={`text-[11px] font-semibold ${
                biz.active_subscription.days_remaining <= 7 ? 'text-warning' : 'text-success'
              }`}>
                {biz.active_subscription.days_remaining}d left
              </span>
            </div>
          ) : (
            <Badge dot variant="warning">No plan</Badge>
          )}
        </div>

        {/* Shops count */}
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">
            Active shops
          </p>
          <p className="text-[13px] font-bold text-foreground">{biz.shop_count}</p>
        </div>
      </div>

      {/* Shops list */}
      {biz.shops.length > 0 && (
        <div className="border-t border-border">
          <div className="px-4 py-2 bg-muted/40">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
              Shops ({biz.shops.length})
            </p>
          </div>
          <div className="divide-y divide-border-soft">
            {biz.shops.map(shop => (
              <div key={shop.id} className="px-4 py-2.5 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center shrink-0">
                    <ShopIcon />
                  </div>
                  <div>
                    <p className="text-[12px] font-semibold text-foreground">{shop.name}</p>
                    {shop.address && (
                      <p className="text-[11px] text-muted-foreground truncate max-w-[200px]">{shop.address}</p>
                    )}
                  </div>
                </div>
                <Badge dot variant={shop.is_active ? 'success' : 'danger'}>
                  {shop.is_active ? 'Open' : 'Closed'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StoreIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
function ShopIcon()  { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>; }
