import { Users, UserCheck, Star, TrendingUp } from 'lucide-react';
import StatCard from '@/components/ds/StatCard';
import { StatCardSkeleton } from '@/components/ds/Skeleton';
import { fetchCustomersAction } from '@/actions/customers';

export function CustomerStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
    </div>
  );
}

export default async function CustomerStats() {
  const result  = await fetchCustomersAction({ limit: 500 });
  const items   = result.ok ? result.data : [];
  const total   = result.ok ? result.count : 0;
  const active  = items.filter(c => c.is_active).length;
  const loyalty = items.reduce((sum, c) => sum + (c.loyalty_points ?? 0), 0);
  const revenue = items.reduce((sum, c) => sum + parseFloat(c.total_purchases || '0'), 0);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        label="Total Customers"
        value={total}
        sub="All profiles"
        icon={<Users />}
        accent="text-primary bg-primary/10"
      />
      <StatCard
        label="Active"
        value={active}
        sub="Currently enabled"
        icon={<UserCheck />}
        accent="text-green-600 bg-green-50"
      />
      <StatCard
        label="Loyalty Points"
        value={loyalty.toLocaleString()}
        sub="Total issued"
        icon={<Star />}
        accent="text-amber-600 bg-amber-50"
      />
      <StatCard
        label="Total Revenue"
        value={`SDG ${revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
        sub="Lifetime purchases"
        icon={<TrendingUp />}
        accent="text-blue-600 bg-blue-50"
      />
    </div>
  );
}
