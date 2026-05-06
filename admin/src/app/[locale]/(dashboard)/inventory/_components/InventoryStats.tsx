import { Package, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import StatCard from '@/components/ds/StatCard';
import { StatCardSkeleton } from '@/components/ds/Skeleton';
import { fetchStockLevelsAction } from '@/actions/inventory';

export function InventoryStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
    </div>
  );
}

export default async function InventoryStats() {
  const result = await fetchStockLevelsAction({ limit: 500 });
  const items  = result.ok ? result.data : [];

  const total    = result.ok ? result.count : 0;
  const outCount = items.filter(i => i.is_out_of_stock).length;
  const lowCount = items.filter(i => i.is_low_stock && !i.is_out_of_stock).length;
  const okCount  = items.filter(i => !i.is_low_stock && !i.is_out_of_stock).length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        label="Total SKUs"
        value={total}
        sub="Tracked across all shops"
        icon={<Package />}
        accent="text-primary bg-primary/10"
      />
      <StatCard
        label="In Stock"
        value={okCount}
        sub="At healthy levels"
        icon={<CheckCircle />}
        accent="text-green-600 bg-green-50"
      />
      <StatCard
        label="Low Stock"
        value={lowCount}
        sub="Below minimum level"
        icon={<AlertTriangle />}
        accent="text-amber-600 bg-amber-50"
      />
      <StatCard
        label="Out of Stock"
        value={outCount}
        sub="Needs restocking"
        icon={<XCircle />}
        accent="text-destructive bg-destructive/10"
      />
    </div>
  );
}
