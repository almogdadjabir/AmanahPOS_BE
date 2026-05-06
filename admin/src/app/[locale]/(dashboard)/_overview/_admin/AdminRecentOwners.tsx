import Avatar from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, Clock } from 'lucide-react';
import type { AdminOwner } from '@/types/api';
import type { AdminStats } from './types';

type Props = { stats: AdminStats };

export default function AdminRecentOwners({ stats }: Props) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <span className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center [&_svg]:size-3.5 text-muted-foreground">
            <Clock />
          </span>
          <div>
            <p className="text-sm font-bold text-foreground leading-tight">Recent Owners</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Latest registrations</p>
          </div>
        </div>

        {stats && stats.total_owners > 0 && (
          <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
            {stats.total_owners.toLocaleString('en-US')} total
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        {!stats ? (
          <RecentOwnersSkeleton />
        ) : stats.recent_owners.length === 0 ? (
          <RecentOwnersEmpty />
        ) : (
          <div className="space-y-0.5">
            {stats.recent_owners.map(owner => (
              <OwnerRow key={owner.id} owner={owner} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OwnerRow({ owner }: { owner: AdminOwner }) {
  const status    = getOwnerStatus(owner);
  const ownerName = owner.full_name || owner.phone;

  return (
    <div className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/60 transition-colors cursor-default">
      <Avatar name={ownerName} size={32} />

      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-foreground truncate leading-tight">{ownerName}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {owner.business_count} {owner.business_count === 1 ? 'business' : 'businesses'}
        </p>
      </div>

      <Badge dot variant={status.variant} className="shrink-0 text-[10px]">
        {status.label}
      </Badge>
    </div>
  );
}

function getOwnerStatus(owner: AdminOwner): { label: string; variant: 'success' | 'warning' | 'danger' } {
  if (owner.has_active_subscription) return { label: 'Active',   variant: 'success' };
  if (owner.is_active)               return { label: 'No sub',   variant: 'warning' };
  return                                    { label: 'Inactive', variant: 'danger'  };
}

function RecentOwnersSkeleton() {
  return (
    <div className="space-y-1 px-2 py-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-11 rounded-lg" />
      ))}
    </div>
  );
}

function RecentOwnersEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
        <Users className="size-4 text-muted-foreground" />
      </div>
      <p className="text-[13px] font-semibold text-foreground">No owners yet</p>
      <p className="text-xs text-muted-foreground mt-1">Register the first owner to get started.</p>
    </div>
  );
}
