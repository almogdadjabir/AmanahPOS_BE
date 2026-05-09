import { Bone, CardGridSkeleton } from '@/components/ds/Skeleton';

export default function PlansLoading() {
  return (
    <div className="space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between mb-1">
        <div className="space-y-2">
          <Bone className="h-7 w-36" />
          <Bone className="h-3.5 w-48" />
        </div>
        <Bone className="h-9 w-28 rounded-lg shrink-0" />
      </div>

      {/* Plan cards */}
      <CardGridSkeleton cards={6} />
    </div>
  );
}
