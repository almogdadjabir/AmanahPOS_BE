'use client';

import { useCallback, useTransition } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Search, Plus } from 'lucide-react';
import type { StaffUser } from '@/types/api';
import type { PaginatedStaff } from '@/services/users';
import Avatar from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

type UserRole = 'owner' | 'manager' | 'cashier';

interface Props {
  data:     PaginatedStaff;
  onToggle: (id: string, currentlyActive: boolean) => Promise<void>;
}

export default function UsersTable({ data, onToggle }: Props) {
  const t            = useTranslations('users');
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const search = searchParams.get('search') ?? '';
  const status = searchParams.get('status') ?? 'all';
  const role   = searchParams.get('role')   ?? 'all';
  const page   = Number(searchParams.get('page') ?? '1');

  const push = useCallback((updates: Record<string, string>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([k, v]) => {
      if (v === '' || v === 'all') params.delete(k);
      else params.set(k, v);
    });
    if (updates.search !== undefined || updates.status !== undefined || updates.role !== undefined) {
      params.delete('page');
    }
    startTransition(() => router.replace(`${pathname}?${params.toString()}`));
  }, [router, pathname, searchParams]);

  const { users, total, total_pages } = data;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-card rounded-xl border border-border shadow-card px-4 py-3 flex flex-wrap items-center gap-2.5">
        <div className="relative flex-1 min-w-44">
          <span className="absolute inset-y-0 start-3 flex items-center pointer-events-none text-muted-foreground">
            <Search className="size-3.5" />
          </span>
          <input
            type="search"
            placeholder={t('searchPlaceholder')}
            defaultValue={search}
            onChange={e => push({ search: e.target.value })}
            className="w-full h-8 ps-8 pe-3 rounded-md border border-border bg-muted text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all"
          />
        </div>

        <select
          value={status}
          onChange={e => push({ status: e.target.value })}
          className="h-8 px-2.5 rounded-md border border-border bg-muted text-xs font-medium text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all"
        >
          <option value="all">{t('filters.allStatus')}</option>
          <option value="active">{t('active')}</option>
          <option value="inactive">{t('inactive')}</option>
        </select>

        <select
          value={role}
          onChange={e => push({ role: e.target.value })}
          className="h-8 px-2.5 rounded-md border border-border bg-muted text-xs font-medium text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-primary transition-all"
        >
          <option value="all">{t('filters.allRoles')}</option>
          <option value="owner">{t('roles.owner')}</option>
          <option value="manager">{t('roles.manager')}</option>
          <option value="cashier">{t('roles.cashier')}</option>
        </select>

        <Button variant="default" size="sm" className="ms-auto">
          <Plus className="size-3.5" />{t('addUser')}
        </Button>
      </div>

      {/* Table */}
      <div className={`bg-card rounded-xl border border-border shadow-card overflow-hidden transition-opacity ${isPending ? 'opacity-60' : 'opacity-100'}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-start px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t('name')}</th>
                <th className="text-start px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t('phone')}</th>
                <th className="text-start px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden md:table-cell">{t('role')}</th>
                <th className="text-start px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">{t('status')}</th>
                <th className="text-start px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider hidden lg:table-cell">{t('joinDate')}</th>
                <th className="px-4 py-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider text-end">{t('actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-muted-foreground text-sm">{t('noResults')}</td>
                </tr>
              ) : users.map(user => (
                <UserRow key={user.id} user={user} onToggle={onToggle} t={t} />
              ))}
            </tbody>
          </table>
        </div>

        {total > 0 && (
          <div className="px-4 py-3 border-t border-border flex items-center justify-between gap-4">
            <span className="text-xs text-muted-foreground">
              {t('showing')} {Math.min((page - 1) * 10 + 1, total)}–{Math.min(page * 10, total)} {t('of')} {total} {t('results')}
            </span>
            <div className="flex gap-1.5">
              <Button size="sm" variant="secondary" disabled={page <= 1} onClick={() => push({ page: String(page - 1) })}>
                {t('previous')}
              </Button>
              <Button size="sm" variant="secondary" disabled={page >= total_pages} onClick={() => push({ page: String(page + 1) })}>
                {t('next')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function UserRow({
  user,
  onToggle,
  t,
}: {
  user:     StaffUser;
  onToggle: (id: string, active: boolean) => Promise<void>;
  t:        ReturnType<typeof useTranslations<'users'>>;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <tr className="hover:bg-muted/40 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Avatar name={user.full_name} size={30} />
          <span className="font-medium text-foreground text-[13px]">{user.full_name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{user.phone}</td>
      <td className="px-4 py-3 hidden md:table-cell">
        <Badge variant={roleVariant(user.role)}>
          {t(`roles.${user.role}`)}
        </Badge>
      </td>
      <td className="px-4 py-3">
        <Badge dot variant={user.is_active ? 'success' : 'danger'}>
          {user.is_active ? t('active') : t('inactive')}
        </Badge>
      </td>
      <td className="px-4 py-3 text-muted-foreground text-xs hidden lg:table-cell">
        {new Date(user.created_at).toLocaleDateString()}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1.5">
          <Button size="sm" variant="ghost">{t('edit')}</Button>
          <Button
            size="sm"
            variant={user.is_active ? 'destructive' : 'default'}
            disabled={isPending}
            onClick={() => startTransition(() => onToggle(user.id, user.is_active))}
          >
            {user.is_active ? t('deactivate') : t('activate')}
          </Button>
        </div>
      </td>
    </tr>
  );
}

function roleVariant(role: UserRole): 'info' | 'warning' | 'default' {
  if (role === 'owner')   return 'info';
  if (role === 'manager') return 'warning';
  return 'default';
}
