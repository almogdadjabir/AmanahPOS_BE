import { Skeleton } from '@/components/ui/skeleton';

export function SubscriptionSummarySkeleton() {
  return (
    <div className="space-y-4">
      {/* Hero card skeleton — no accent bar since we removed it */}
      <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden mb-4">
        <div className="p-5 space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-2.5 w-20" />
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-3 w-64" />
            </div>
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl bg-muted/40 border border-border/40 p-4 space-y-2">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Usage + features skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-xs p-5">
          <Skeleton className="h-2.5 w-28 mb-4" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-7 w-20" />
                <Skeleton className="h-1.5 w-full rounded-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="lg:col-span-1 rounded-xl border border-border bg-card shadow-xs p-5">
          <Skeleton className="h-2.5 w-24 mb-4" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-2.5 py-1.5">
                <Skeleton className="h-[18px] w-[18px] rounded-full shrink-0" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SubscriptionBodySkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-xs p-5">
        <Skeleton className="h-2.5 w-28 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-7 w-20" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
      <div className="lg:col-span-1 rounded-xl border border-border bg-card shadow-xs p-5">
        <Skeleton className="h-2.5 w-24 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2.5 py-1.5">
              <Skeleton className="h-[18px] w-[18px] rounded-full shrink-0" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
