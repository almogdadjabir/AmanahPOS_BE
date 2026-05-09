import { Bone, TableSkeleton } from '@/components/ds/Skeleton';

export default function OwnersLoading() {
  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between mb-1">
        <div className="space-y-2">
          <Bone className="h-7 w-40" />
          <Bone className="h-3.5 w-56" />
        </div>
        <Bone className="h-9 w-32 rounded-lg shrink-0" />
      </div>

      {/* Controls bar */}
      <div className="flex gap-3">
        <Bone className="h-10 flex-1 max-w-xs rounded-lg" />
        <Bone className="h-10 w-28 rounded-lg shrink-0" />
        <Bone className="h-10 w-32 rounded-lg shrink-0" />
      </div>

      {/* Table */}
      <TableSkeleton rows={8} cols={7} />
    </div>
  );
}
