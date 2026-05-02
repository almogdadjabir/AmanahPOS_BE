import { cn } from '@/lib/cn';

export function Bone({ className }: { className?: string }) {
  return <div className={cn('bg-surface-muted rounded animate-pulse', className)} />;
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-border-soft shadow-card p-4 space-y-3">
      <div className="flex justify-between">
        <Bone className="h-3 w-20" />
        <Bone className="h-7 w-7 rounded-lg" />
      </div>
      <Bone className="h-7 w-24" />
      <Bone className="h-2.5 w-16" />
    </div>
  );
}

export function TableRowSkeleton({ cols = 5 }: { cols?: number }) {
  return (
    <tr className="border-b border-border-soft">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Bone className="w-8 h-8 rounded-full shrink-0" />
          <Bone className="h-3 w-28" />
        </div>
      </td>
      {Array.from({ length: cols - 1 }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <Bone className="h-3 w-20" />
        </td>
      ))}
    </tr>
  );
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="bg-white rounded-xl border border-border-soft shadow-card overflow-hidden">
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

export function ChartSkeleton() {
  return (
    <div className="bg-white rounded-xl border border-border-soft shadow-card p-4 space-y-4">
      <div className="flex justify-between">
        <div className="space-y-1.5">
          <Bone className="h-3.5 w-28" />
          <Bone className="h-2.5 w-20" />
        </div>
        <div className="text-end space-y-1.5">
          <Bone className="h-5 w-24 ms-auto" />
          <Bone className="h-2.5 w-16 ms-auto" />
        </div>
      </div>
      <Bone className="h-[170px] w-full rounded-lg" />
    </div>
  );
}
