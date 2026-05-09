import { Users, UserCheck, Shield, CreditCard } from 'lucide-react';
import StatCard from '@/components/ds/StatCard';
import { StatCardSkeleton } from '@/components/ds/Skeleton';
import { fetchStaffAction } from '@/actions/staff';

export function StaffStatsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)}
    </div>
  );
}

export default async function StaffStats() {
  // fetchStaffAction always fetches all users from the API then filters client-side.
  // A single call with limit: 500 is correct — the 4-parallel-calls variant was a regression
  // that made 4 full API requests instead of 1.
  const result   = await fetchStaffAction({ limit: 500 });
  const items    = result.ok ? result.data : [];
  const total    = result.ok ? result.count : 0;
  const active   = items.filter(u => u.is_active).length;
  const managers = items.filter(u => u.role === 'manager').length;
  const cashiers = items.filter(u => u.role === 'cashier').length;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      <StatCard
        label="Total Staff"
        value={total}
        sub="All accounts"
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
        label="Managers"
        value={managers}
        sub="Full access role"
        icon={<Shield />}
        accent="text-blue-600 bg-blue-50"
      />
      <StatCard
        label="Cashiers"
        value={cashiers}
        sub="POS access role"
        icon={<CreditCard />}
        accent="text-amber-600 bg-amber-50"
      />
    </div>
  );
}
