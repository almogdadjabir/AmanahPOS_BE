import { Bone, StatCardSkeleton, TableSkeleton } from '@/components/ds/Skeleton';

export default function UsersLoading() {
  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between mb-1">
        <div className="space-y-2">
          <Bone className="h-7 w-24" />
          <Bone className="h-3.5 w-48" />
        </div>
        <Bone className="h-9 w-28 rounded-lg shrink-0" />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => <StatCardSkeleton key={i} />)}
      </div>

      {/* Filters bar */}
      <div className="flex gap-3">
        <Bone className="h-10 flex-1 max-w-xs rounded-lg" />
        <Bone className="h-10 w-28 rounded-lg shrink-0" />
        <Bone className="h-10 w-24 rounded-lg shrink-0" />
      </div>

      {/* Table */}
      <TableSkeleton rows={8} cols={5} />
    </div>
  );
}
