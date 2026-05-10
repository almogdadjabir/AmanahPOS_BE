import { Package, AlertTriangle, XCircle, CheckCircle } from 'lucide-react';
import { getTranslations } from 'next-intl/server';
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
  const [t, totalRes, outRes, lowRes] = await Promise.all([
    getTranslations('inventory'),
    fetchStockLevelsAction({ limit: 1 }),
    fetchStockLevelsAction({ limit: 1, status: 'out_of_stock' }),
    fetchStockLevelsAction({ limit: 1, status: 'low_stock' }),
  ]);
  const total    = totalRes.ok ? totalRes.count : 0;
  const outCount = outRes.ok   ? outRes.count   : 0;
  const lowCount = lowRes.ok   ? Math.max(0, lowRes.count - outCount) : 0;
  const okCount  = Math.max(0, total - outCount - lowCount);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        label={t('stats.totalSkus')}
        value={total}
        sub={t('stats.totalSkusSub')}
        icon={<Package />}
        accent="text-primary bg-primary/10"
      />
      <StatCard
        label={t('stats.inStock')}
        value={okCount}
        sub={t('stats.inStockSub')}
        icon={<CheckCircle />}
        accent="text-green-600 bg-green-50"
      />
      <StatCard
        label={t('stats.lowStock')}
        value={lowCount}
        sub={t('stats.lowStockSub')}
        icon={<AlertTriangle />}
        accent="text-amber-600 bg-amber-50"
      />
      <StatCard
        label={t('stats.outOfStock')}
        value={outCount}
        sub={t('stats.outOfStockSub')}
        icon={<XCircle />}
        accent="text-destructive bg-destructive/10"
      />
    </div>
  );
}
