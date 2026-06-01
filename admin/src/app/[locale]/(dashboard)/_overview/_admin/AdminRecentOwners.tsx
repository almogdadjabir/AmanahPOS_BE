import Avatar from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { getTranslations } from 'next-intl/server';
import { Users, Clock } from 'lucide-react';
import type { AdminOwner } from '@/types/api';
import type { AdminStats } from './types';

type Props = { stats: AdminStats };

export default async function AdminRecentOwners({ stats }: Props) {
  const t = await getTranslations('dashboard');
  return (
    <div className="bg-card rounded-xl border border-border shadow-card flex flex-col h-full">
      {/* Header */}
      <div className="flex items-start justify-between px-5 pt-5 pb-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          {/* Fix #8: 32px rounded-[9px] bg-muted neutral chip */}
          <span className="w-[32px] h-[32px] rounded-[9px] bg-muted flex items-center justify-center [&_svg]:size-[15px] text-muted-foreground shrink-0">
            <Clock />
          </span>
          <div>
            <p className="text-sm font-semibold text-foreground tracking-[-.015em] leading-tight">{t('recentOwners.title')}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">{t('recentOwners.sub')}</p>
          </div>
        </div>

        {stats && stats.total_owners > 0 && (
          <span className="text-[11px] font-bold text-muted-foreground tabular-nums">
            {stats.total_owners.toLocaleString('en-US')} {t('recentOwners.total')}
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

async function OwnerRow({ owner }: { owner: AdminOwner }) {
  const t  = await getTranslations('dashboard');
  const tc = await getTranslations('common');
  const ownerName = owner.full_name || owner.phone;
  const variant = getOwnerStatusVariant(owner);
  const label = owner.has_active_subscription
    ? tc('active')
    : owner.is_active
    ? t('recentOwners.statusNoSub')
    : tc('inactive');

  return (
    <div className="flex items-center gap-3 px-2 py-2.5 rounded-lg hover:bg-muted/60 transition-colors cursor-default">
      <Avatar name={ownerName} size={32} />

      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-semibold text-foreground truncate leading-tight">{ownerName}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {owner.business_count} {owner.business_count === 1 ? t('recentOwners.business') : t('recentOwners.businesses')}
        </p>
      </div>

      <Badge dot variant={variant} className="shrink-0 text-[10px]">
        {label}
      </Badge>
    </div>
  );
}

// Fix #9: inactive = neutral gray — red is reserved for error/refund/expired-overdue only
function getOwnerStatusVariant(owner: AdminOwner): 'success' | 'warning' | 'default' {
  if (owner.has_active_subscription) return 'success';
  if (owner.is_active)               return 'warning';
  return 'default';
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

async function RecentOwnersEmpty() {
  const t = await getTranslations('dashboard');
  return (
    <div className="flex flex-col items-center justify-center py-10 text-center">
      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center mb-3">
        <Users className="size-4 text-muted-foreground" />
      </div>
      <p className="text-[13px] font-semibold text-foreground">{t('recentOwners.empty.title')}</p>
      <p className="text-xs text-muted-foreground mt-1">{t('recentOwners.empty.desc')}</p>
    </div>
  );
}
