import { Suspense } from 'react';
import { getUsers, toggleUserStatus } from '@/services/users';
import UsersTable from './UsersTable';

interface Props {
  searchParams: Promise<{ search?: string; status?: string; role?: string; page?: string }>;
}

async function handleToggle(id: string, currentlyActive: boolean) {
  'use server';
  await toggleUserStatus(id, currentlyActive);
}

export default async function UsersPage({ searchParams }: Props) {
  const params = await searchParams;

  const data = await getUsers({
    search:   params.search,
    status:   (params.status as 'active' | 'inactive' | 'all') ?? 'all',
    role:     (params.role as 'owner' | 'manager' | 'cashier' | 'all') ?? 'all',
    page:     Number(params.page ?? '1'),
    pageSize: 10,
  });

  return (
    <Suspense fallback={<LoadingSkeleton />}>
      <UsersTable data={data} onToggle={handleToggle} />
    </Suspense>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-border-soft shadow-card h-14 animate-pulse" />
      <div className="bg-white rounded-xl border border-border-soft shadow-card overflow-hidden">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="px-4 py-4 border-b border-border-soft last:border-0 flex items-center gap-4">
            <div className="w-8 h-8 rounded-full bg-surface-muted animate-pulse shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-3 w-32 bg-surface-muted rounded animate-pulse" />
              <div className="h-2.5 w-24 bg-surface-muted rounded animate-pulse" />
            </div>
            <div className="h-5 w-16 bg-surface-muted rounded animate-pulse" />
            <div className="h-5 w-14 bg-surface-muted rounded animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}
