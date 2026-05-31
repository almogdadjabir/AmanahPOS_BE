import { Skeleton } from '@/components/ui/skeleton';

export function SubscriptionSummarySkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden mb-5">
      <div className="h-[3px] bg-muted animate-pulse" />
      <div className="p-6 space-y-6">
        {/* Plan name */}
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-20" />
            <Skeleton className="h-7 w-52" />
            <Skeleton className="h-3 w-64" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>
        {/* Metric tiles */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-muted/40 border border-border/40 p-4 space-y-2">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-6 w-24" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SubscriptionBodySkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Usage skeleton — 2/3 */}
      <div className="lg:col-span-2 rounded-xl border border-border bg-card shadow-card p-5">
        <Skeleton className="h-2.5 w-28 mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3">
              <Skeleton className="h-2.5 w-16" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
      {/* Features skeleton — 1/3 */}
      <div className="lg:col-span-1 rounded-xl border border-border bg-card shadow-card p-5">
        <Skeleton className="h-2.5 w-24 mb-4" />
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
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
