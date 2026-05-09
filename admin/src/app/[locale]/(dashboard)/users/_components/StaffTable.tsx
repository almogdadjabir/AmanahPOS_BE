import { Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import EmptyState from '@/components/ds/EmptyState';
import Pagination from '@/components/ds/Pagination';
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
} from '@/components/ui/table';
import { fetchStaffAction } from '@/actions/staff';
import StaffRowActions from './StaffRowActions';
import type { Shop, StaffUser } from '@/types/api';

interface Props {
  search?: string;
  status?: string;
  role?:   string;
  page?:   number;
  shops?:  Shop[];
}

const ROLE_LABELS: Record<string, string> = {
  owner:   'Owner',
  manager: 'Manager',
  cashier: 'Cashier',
};

const ROLE_VARIANTS: Record<string, 'primary' | 'info' | 'default'> = {
  owner:   'primary',
  manager: 'info',
  cashier: 'default',
};

export default async function StaffTable({ search, status, role, page = 1, shops = [] }: Props) {
  // Normalise to lowercase so UUID case differences between the businesses API
  // and the users API don't cause silent shopMap misses.
  const shopMap = new Map(shops.map(s => [s.id.toLowerCase(), s.name]));
  let result;
  try {
    result = await fetchStaffAction({
      search: search || undefined,
      status: (status === 'active' || status === 'inactive') ? status : undefined,
      role:   (role === 'manager' || role === 'cashier') ? role : undefined,
      page,
      limit: 25,
    });
  } catch {
    return <TableError message="Check your API connection and try again." />;
  }

  if (!result.ok) return <TableError message={result.error} />;

  const { data: users, count } = result;

  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
        <EmptyState
          icon={<Users />}
          title={search ? 'No staff match your search' : 'No staff members yet'}
          description={
            search
              ? 'Try different keywords or clear the filters.'
              : 'Add your first manager or cashier to get started.'
          }
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
        <span className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center [&_svg]:size-3">
          <Users />
        </span>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
          {count.toLocaleString()} member{count !== 1 ? 's' : ''}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border/60">
            <TableHead className="w-[30%]">Name</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead className="hidden sm:table-cell">Role</TableHead>
            <TableHead className="hidden md:table-cell">Shop</TableHead>
            <TableHead className="hidden lg:table-cell">Status</TableHead>
            <TableHead className="hidden xl:table-cell">Last Login</TableHead>
            <TableHead className="w-[180px]" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map(user => {
            const sid = user.default_shop_id?.toLowerCase();
            const shopName = sid ? (shopMap.get(sid) ?? `Shop`) : null;
            return <StaffRow key={user.id} user={user} shopName={shopName} />;
          })}
        </TableBody>
      </Table>

      <Pagination count={count} pageSize={25} />
    </div>
  );
}

function StaffRow({ user, shopName }: { user: StaffUser; shopName: string | null }) {
  const lastLogin = user.last_login_at
    ? new Date(user.last_login_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  return (
    <TableRow className="group hover:bg-muted/40 transition-colors">
      <TableCell>
        <div>
          <p className="text-[13px] font-semibold text-foreground leading-tight">
            {user.full_name || '—'}
          </p>
          {!user.is_verified && (
            <p className="text-[11px] text-amber-600 mt-0.5">Unverified</p>
          )}
        </div>
      </TableCell>

      <TableCell>
        <span className="font-mono text-[12px] text-muted-foreground">{user.phone}</span>
      </TableCell>

      <TableCell className="hidden sm:table-cell">
        <Badge variant={ROLE_VARIANTS[user.role] ?? 'default'}>
          {ROLE_LABELS[user.role] ?? user.role}
        </Badge>
      </TableCell>

      <TableCell className="hidden md:table-cell">
        {shopName ? (
          <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary bg-primary/8 border border-primary/15 px-2 py-0.5 rounded-full">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            {shopName}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell className="hidden lg:table-cell">
        <Badge dot variant={user.is_active ? 'success' : 'danger'}>
          {user.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </TableCell>

      <TableCell className="hidden xl:table-cell">
        <span className="text-xs text-muted-foreground">
          {lastLogin ?? 'Never'}
        </span>
      </TableCell>

      <TableCell>
        <StaffRowActions user={user} />
      </TableCell>
    </TableRow>
  );
}

function TableError({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-10 text-center">
      <p className="text-sm font-semibold text-destructive">Failed to load staff</p>
      <p className="text-xs text-destructive/70 mt-1">{message}</p>
    </div>
  );
}
