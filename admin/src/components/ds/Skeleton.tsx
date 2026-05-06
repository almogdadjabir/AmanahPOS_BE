import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export function Bone({ className }: { className?: string }) {
  return <Skeleton className={cn('', className)} />;
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-4 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-7 w-7 rounded-lg" />
      </div>
      <Skeleton className="h-7 w-24" />
      <Skeleton className="h-2.5 w-16" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-border">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Skeleton className="w-8 h-8 rounded-full shrink-0" />
          <Skeleton className="h-3 w-28" />
        </div>
      </td>
      {Array.from({ length: cols - 1 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Skeleton className="h-3 w-20" />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <table className="w-full">
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} cols={cols} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function CardGridSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: cards }).map((_, i) => (
        <div key={i} className="rounded-2xl border border-border bg-card shadow-card overflow-hidden">
          <div className="h-1 w-full bg-muted" />
          <div className="p-5 space-y-3">
            <div className="flex items-start gap-3">
              <Skeleton className="w-9 h-9 rounded-xl shrink-0" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
            <Skeleton className="h-12 w-full rounded-xl" />
            <div className="grid grid-cols-3 gap-1.5">
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
              <Skeleton className="h-14 rounded-lg" />
            </div>
            <div className="flex justify-between pt-2">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-5 w-12 rounded-md" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function ChartSkeleton() {
  return (
    <div className="rounded-xl border border-border bg-card shadow-card p-4 space-y-4">
      <div className="flex justify-between">
        <div className="space-y-1.5">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="h-2.5 w-20" />
        </div>
        <div className="space-y-1.5">
          <Skeleton className="h-5 w-24 ms-auto" />
          <Skeleton className="h-2.5 w-16 ms-auto" />
        </div>
      </div>
      <Skeleton className="h-[170px] w-full rounded-lg" />
    </div>
  );
}
