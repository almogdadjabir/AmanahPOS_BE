import { Bone } from '@/components/ds/Skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export default function OwnerDetailLoading() {
  return (
    <div className="space-y-5">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <Bone className="h-3.5 w-16" />
        <Bone className="h-3 w-3 rounded-full" />
        <Bone className="h-3.5 w-32" />
      </div>

      {/* Profile card */}
      <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
        {/* Banner */}
        <div className="h-[90px] bg-gradient-to-br from-muted/80 to-muted/40 animate-pulse" />

        {/* Avatar + info */}
        <div className="-mt-10 px-6 pb-6 flex items-end gap-4">
          <Skeleton className="w-20 h-20 rounded-full ring-4 ring-card shrink-0" />
          <div className="flex-1 pb-1 space-y-2">
            <Skeleton className="h-5 w-44" />
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="shrink-0 flex gap-2 pb-1">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-24 rounded-md" />
          </div>
        </div>

        {/* Stats strip */}
        <div className="px-6 pb-5 grid grid-cols-4 gap-3 border-t border-border pt-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-muted/40 p-3 space-y-1.5">
              <Skeleton className="h-2.5 w-14" />
              <Skeleton className="h-5 w-10" />
            </div>
          ))}
        </div>
      </div>

      {/* Businesses section */}
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Bone className="h-3.5 w-24" />
          <Bone className="h-3.5 w-8 rounded-full" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border overflow-hidden">
              <div className="px-4 py-3 bg-muted/30 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <Skeleton className="w-8 h-8 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-32" />
                    <Skeleton className="h-2.5 w-20" />
                  </div>
                </div>
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <div className="px-4 py-3 flex items-center gap-4">
                <Skeleton className="h-5 w-20 rounded-full" />
                <div className="w-px h-4 bg-border" />
                <Skeleton className="h-3.5 w-12" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
