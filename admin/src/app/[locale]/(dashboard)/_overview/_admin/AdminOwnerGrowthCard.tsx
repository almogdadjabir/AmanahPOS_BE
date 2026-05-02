import GrowthChartToggle from "../GrowthChart";
import type { AdminStats } from "./types";

type Props = {
  stats: AdminStats;
};

export default function AdminOwnerGrowthCard({ stats }: Props) {
  return (
    <div className="lg:col-span-2 bg-white rounded-xl border border-border-soft shadow-card p-4">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-[13px] font-semibold text-text-primary">
            Owner Growth
          </p>
          <p className="text-xs text-text-hint mt-0.5">
            New registrations · last 6 months
          </p>
        </div>

        {stats && (
          <div className="text-end">
            <p className="text-lg font-bold text-text-primary tabular-nums">
              {stats.total_owners.toLocaleString("en-US")}
            </p>
            <p className="text-[11px] text-text-hint">total owners</p>
          </div>
        )}
      </div>

      {!stats ? (
        <div className="h-[160px] bg-surface-muted rounded-lg animate-pulse" />
      ) : (
        <GrowthChartToggle data={stats.monthly_growth} />
      )}
    </div>
  );
}
