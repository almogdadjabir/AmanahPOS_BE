import { StatCardSkeleton, ChartSkeleton, TableSkeleton, Bone } from '@/components/ds/Skeleton';

export default function DashboardLoading() {
  return (
    <div className="space-y-5">
      {/* Health banner placeholder */}
      <Bone className="h-12 w-full rounded-xl" />

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2"><ChartSkeleton /></div>
        <div className="bg-white rounded-xl border border-border-soft shadow-card p-4 space-y-3">
          <div className="flex justify-between">
            <Bone className="h-3.5 w-24" />
            <Bone className="h-5 w-10 rounded-full" />
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <Bone className="w-7 h-7 rounded-full shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Bone className="h-3 w-24" />
                <Bone className="h-2.5 w-16" />
              </div>
              <Bone className="h-5 w-14 rounded-full shrink-0" />
            </div>
          ))}
        </div>
      </div>

      {/* Table */}
      <TableSkeleton rows={5} cols={5} />
    </div>
  );
}
