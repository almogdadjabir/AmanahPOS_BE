'use client';

import { useTranslations } from 'next-intl';
import {
  AlertTriangle,
  ArrowDownToLine,
  Calendar,
  Package,
  ShoppingCart,
  Users,
  XCircle,
} from 'lucide-react';
import StatCard from '@/components/ds/StatCard';
import type { PremiumInventorySummary } from '@/types/api';

export default function PremiumKPIRow({ data }: { data: PremiumInventorySummary }) {
  const t = useTranslations('inventory');
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        label={t('stats.totalSkus')}
        value={data.stock_items_count}
        sub={t('stats.totalSkusSub')}
        icon={<Package />}
        accent="text-primary bg-primary/10"
      />
      <StatCard
        label={t('stats.lowStock')}
        value={data.low_stock_count}
        sub={t('stats.lowStockSub')}
        icon={<AlertTriangle />}
        accent="text-amber-600 bg-amber-50"
      />
      <StatCard
        label={t('stats.outOfStock')}
        value={data.out_of_stock_count}
        sub={t('stats.outOfStockSub')}
        icon={<XCircle />}
        accent="text-destructive bg-destructive/10"
      />
      <StatCard
        label={t('premium.kpiExpiringSoon')}
        value={data.expiring_soon_count}
        sub="≤ 30 days"
        icon={<Calendar />}
        accent="text-orange-600 bg-orange-50"
      />
      <StatCard
        label={t('premium.kpiExpired')}
        value={data.expired_count}
        icon={<XCircle />}
        accent="text-red-700 bg-red-50"
      />
      <StatCard
        label={t('premium.kpiActiveVendors')}
        value={data.active_vendors_count}
        icon={<Users />}
        accent="text-violet-600 bg-violet-50"
      />
      <StatCard
        label={t('premium.kpiInboundThisMonth')}
        value={data.inbound_this_month_count}
        icon={<ArrowDownToLine />}
        accent="text-blue-600 bg-blue-50"
      />
      <StatCard
        label={t('premium.kpiUnitsReceived')}
        value={data.received_quantity_this_month}
        icon={<ShoppingCart />}
        accent="text-green-700 bg-green-50"
      />
    </div>
  );
}
