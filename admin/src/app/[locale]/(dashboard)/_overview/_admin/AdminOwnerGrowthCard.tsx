import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import GrowthChartToggle from '../GrowthChart';
import type { AdminStats } from './types';

type Props = { stats: AdminStats };

export default async function AdminOwnerGrowthCard({ stats }: Props) {
  const t = await getTranslations('dashboard');
  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5 flex flex-col h-full">
      {/* Card header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center [&_svg]:size-3.5">
              <TrendingUp />
            </span>
            <p className="text-sm font-bold text-foreground">{t('growth.title')}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ms-9">
            {t('growth.sub')}
          </p>
        </div>

        {stats && (
          <div className="text-end shrink-0">
            <p className="text-xl font-black text-foreground tabular-nums">
              {stats.total_owners.toLocaleString('en-US')}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">
              {t('growth.totalOwners')}
            </p>
          </div>
        )}
      </div>

      <div className="mt-4">
        {!stats
          ? <Skeleton className="h-[160px] rounded-lg w-full" />
          : <GrowthChartToggle data={stats.monthly_growth} />
        }
      </div>
    </div>
  );
}
