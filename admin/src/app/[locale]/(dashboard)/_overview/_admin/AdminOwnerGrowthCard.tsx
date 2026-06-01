import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
import GrowthChartToggle from '../GrowthChart';
import type { AdminStats } from './types';

type Props = { stats: AdminStats };

export default async function AdminOwnerGrowthCard({ stats }: Props) {
  const t = await getTranslations('dashboard');
  return (
    <div className="bg-card rounded-xl border border-border shadow-xs p-5 flex flex-col h-full">
      {/* Card header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="flex items-center gap-2">
            {/* Fix #8: teal-tint chip for primary panel, 32px rounded-[9px] */}
            <span className="w-[32px] h-[32px] rounded-[9px] bg-primary-tint text-primary flex items-center justify-center [&_svg]:size-[15px]">
              <TrendingUp />
            </span>
            <p className="text-sm font-semibold text-foreground tracking-[-.015em]">{t('growth.title')}</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ms-10">
            {t('growth.sub')}
          </p>
        </div>

        {stats && (
          <div className="text-end shrink-0">
            {/* Fix #7: font-semibold 27px tight tracking */}
            <p className="text-[27px] font-semibold text-foreground tabular-nums tracking-[-.03em] num">
              {stats.total_owners.toLocaleString('en-US')}
            </p>
            <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground mt-0.5">
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
