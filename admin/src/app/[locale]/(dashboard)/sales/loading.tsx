import { Bone, ChartSkeleton, TableSkeleton } from '@/components/ds/Skeleton';

export default function SalesLoading() {
  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1.5">
          <Bone className="h-7 w-20" />
          <Bone className="h-3.5 w-48" />
        </div>
      </div>

      {/* Shop switcher bar */}
      <Bone className="h-10 w-full max-w-sm rounded-xl" />

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-card rounded-xl border border-border shadow-[0_1px_4px_0_rgb(0_0_0/.05)] p-5 space-y-3">
            <Bone className="h-2.5 w-16" />
            <Bone className="h-8 w-28" />
            <Bone className="h-3 w-20" />
          </div>
        ))}
      </div>

      {/* Chart row */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
        <div className="lg:col-span-3">
          <ChartSkeleton />
        </div>
        <div className="lg:col-span-2 bg-card rounded-xl border border-border p-5 space-y-4">
          <Bone className="h-3.5 w-24" />
          <Bone className="h-2 w-full rounded-full" />
          <div className="space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bone className="w-2 h-2 rounded-full" />
                  <Bone className="h-3 w-16" />
                </div>
                <Bone className="h-3 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent transactions */}
      <TableSkeleton rows={8} cols={7} />
    </div>
  );
}
