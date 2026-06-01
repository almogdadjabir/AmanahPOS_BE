import { Bone } from '@/components/ds/Skeleton';

export default function SystemLoading() {
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Bone className="h-7 w-36" />
            <Bone className="h-5 w-16 rounded-full" />
          </div>
          <Bone className="h-4 w-56" />
        </div>
        <div className="flex items-center gap-2">
          <Bone className="h-9 w-20 rounded-lg" />
          <Bone className="h-9 w-24 rounded-lg" />
        </div>
      </div>

      {/* Services grid */}
      <div>
        <Bone className="h-4 w-20 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-5 space-y-3">
              <div className="flex items-start justify-between">
                <Bone className="h-3 w-16" />
                <Bone className="w-8 h-8 rounded-[9px]" />
              </div>
              <div className="space-y-1.5">
                <Bone className="h-5 w-12 rounded-full" />
                <Bone className="h-3 w-20" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Operations grid */}
      <div>
        <Bone className="h-4 w-32 mb-3" />
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card rounded-xl border border-border p-5 space-y-3">
              <div className="flex items-start justify-between">
                <Bone className="h-3 w-20" />
                <Bone className="w-8 h-8 rounded-[9px]" />
              </div>
              <div className="space-y-1.5">
                <Bone className="h-7 w-14" />
                <Bone className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Warnings */}
      <div className="bg-card rounded-xl border border-border p-5 space-y-3">
        <Bone className="h-4 w-24" />
        <div className="space-y-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Bone key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
