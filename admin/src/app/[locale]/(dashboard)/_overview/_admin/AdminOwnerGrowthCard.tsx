import { Skeleton } from '@/components/ui/skeleton';
import { TrendingUp } from 'lucide-react';
import GrowthChartToggle from '../GrowthChart';
import type { AdminStats } from './types';

type Props = { stats: AdminStats };

export default function AdminOwnerGrowthCard({ stats }: Props) {
  return (
    <div className="bg-card rounded-xl border border-border shadow-card p-5 h-full flex flex-col">
      {/* Card header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center [&_svg]:size-3.5">
              <TrendingUp />
            </span>
            <p className="text-sm font-bold text-foreground">Owner Growth</p>
          </div>
          <p className="text-xs text-muted-foreground mt-1 ms-9">
            New registrations · last 6 months
          </p>
        </div>

        {stats && (
          <div className="text-end shrink-0">
            <p className="text-xl font-black text-foreground tabular-nums">
              {stats.total_owners.toLocaleString('en-US')}
            </p>
            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mt-0.5">
              Total owners
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex-1">
        {!stats
          ? <Skeleton className="h-[160px] rounded-lg w-full" />
          : <GrowthChartToggle data={stats.monthly_growth} />
        }
      </div>
    </div>
  );
}
