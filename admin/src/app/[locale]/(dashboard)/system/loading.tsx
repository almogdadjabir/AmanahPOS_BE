import { Bone } from '@/components/ds/Skeleton';

export default function SystemLoading() {
  return (
    <div className="space-y-4">

      {/* Page header */}
      <div className="flex items-center gap-3 mb-6">
        <Bone className="w-10 h-10 rounded-xl shrink-0" />
        <div className="space-y-2">
          <Bone className="h-7 w-24" />
          <Bone className="h-3.5 w-72" />
        </div>
      </div>

      {/* Status hero card */}
      <div className="rounded-2xl border border-border bg-card shadow-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Bone className="w-12 h-12 rounded-full shrink-0" />
            <div className="space-y-2">
              <Bone className="h-5 w-32" />
              <Bone className="h-3.5 w-48" />
            </div>
          </div>
          <Bone className="h-7 w-20 rounded-full shrink-0" />
        </div>
        <div className="grid grid-cols-3 gap-3 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl bg-muted/40 p-4 space-y-2">
              <Bone className="h-3 w-16" />
              <Bone className="h-5 w-12 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Health cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-border bg-card shadow-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <Bone className="h-3.5 w-20" />
              <Bone className="w-8 h-8 rounded-lg" />
            </div>
            <Bone className="h-6 w-16 rounded-full" />
            <Bone className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Payload / raw card */}
      <div className="rounded-2xl border border-border bg-card shadow-card p-5 space-y-3">
        <Bone className="h-3.5 w-28" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <Bone className="h-3 w-24" />
              <Bone className="h-3 w-40" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
