import { Bone } from '@/components/ds/Skeleton';

export default function ActivityLogsLoading() {
  return (
    <div className="space-y-5">
      {/* Page header */}
      <div className="flex items-center gap-3 mb-1">
        <Bone className="w-10 h-10 rounded-xl shrink-0" />
        <div className="space-y-2">
          <Bone className="h-7 w-36" />
          <Bone className="h-3.5 w-64" />
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-wrap gap-2">
        <Bone className="h-9 flex-1 min-w-[180px] max-w-xs rounded-lg" />
        <Bone className="h-9 w-36 rounded-lg shrink-0" />
        <Bone className="h-9 w-32 rounded-lg shrink-0" />
        <Bone className="h-9 w-32 rounded-lg shrink-0" />
        <Bone className="h-9 w-32 rounded-lg shrink-0" />
      </div>

      {/* Timeline feed skeleton */}
      <div className="rounded-xl border border-border/50 bg-card p-5 shadow-sm space-y-0">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-3">
            <div className="flex flex-col items-center pt-1">
              <Bone className="w-2.5 h-2.5 rounded-full shrink-0" />
              <div className="w-px flex-1 bg-border/40 mt-1.5" />
            </div>
            <div className="flex-1 pb-5 space-y-1.5">
              <div className="flex gap-2">
                <Bone className="h-4 w-24" />
                <Bone className="h-4 w-28" />
                <Bone className="h-4 w-32" />
              </div>
              <Bone className="h-3 w-20" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
