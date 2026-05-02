import { fetchAdminOwners } from '@/services/admin';
import type { AdminOwner } from '@/types/api';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import EmptyState from '@/components/ds/EmptyState';
import Pagination from '@/components/ds/Pagination';
import ViewOwnerButton from './ViewOwnerButton';

interface Props {
  search?: string;
  status?: string;
  sub?: string;
  page?: number;
}

export default async function OwnersTable({ search, status, sub, page = 1 }: Props) {
  let data;
  try {
    data = await fetchAdminOwners({
      search:           search || undefined,
      is_active:        status === 'active' ? true : status === 'inactive' ? false : undefined,
      has_subscription: sub === 'yes' ? true : sub === 'no' ? false : undefined,
      ordering:         '-created_at',
      page,
      page_size:        20,
    });
  } catch {
    return (
      <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-8 text-center">
        <p className="text-[13px] font-semibold text-danger">Failed to load owners</p>
        <p className="text-xs text-danger/70 mt-1">Check API connection and refresh.</p>
      </div>
    );
  }

  if (data.results.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-border-soft shadow-card">
        <EmptyState
          icon={<UsersIcon />}
          title={search ? 'No owners match your search' : 'No owners yet'}
          description={
            search
              ? 'Try different keywords or clear the search.'
              : 'Create the first owner account to get started.'
          }
        />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-border-soft shadow-card overflow-hidden">
      {/* Count header */}
      <div className="px-4 py-2.5 border-b border-border-soft bg-surface-soft flex items-center justify-between">
        <p className="text-[11px] font-semibold text-text-hint uppercase tracking-wider">
          {data.count} owner{data.count !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-soft">
              {['Owner', 'Phone', 'Businesses', 'Subscription', 'Status', 'Joined', ''].map(h => (
                <th
                  key={h}
                  className="text-start px-4 py-2.5 text-[11px] font-semibold text-text-hint uppercase tracking-wider last:text-end whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border-soft">
            {data.results.map(owner => (
              <OwnerRow key={owner.id} owner={owner} />
            ))}
          </tbody>
        </table>
      </div>

      <Pagination count={data.count} pageSize={20} />
    </div>
  );
}

function OwnerRow({ owner }: { owner: AdminOwner }) {
  const joined = new Date(owner.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
  const lastSeen = owner.last_login_at
    ? new Date(owner.last_login_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null;

  return (
    <tr className="hover:bg-surface-soft/50 transition-colors group">
      {/* Owner */}
      <td className="px-4 py-3">
        <div className="flex items-center gap-2.5">
          <Avatar name={owner.full_name || owner.phone} size={30} />
          <div>
            <p className="text-[13px] font-semibold text-text-primary leading-tight">
              {owner.full_name || '—'}
            </p>
            {lastSeen && (
              <p className="text-[10px] text-text-hint mt-0.5">Last seen {lastSeen}</p>
            )}
          </div>
        </div>
      </td>

      {/* Phone */}
      <td className="px-4 py-3">
        <p className="text-[12px] font-mono text-text-secondary">{owner.phone}</p>
        {!owner.is_verified && (
          <p className="text-[10px] text-warning mt-0.5">Unverified</p>
        )}
      </td>

      {/* Businesses */}
      <td className="px-4 py-3 text-[13px] text-text-secondary">{owner.business_count}</td>

      {/* Subscription */}
      <td className="px-4 py-3">
        <Badge dot variant={owner.has_active_subscription ? 'success' : 'warning'}>
          {owner.has_active_subscription ? 'Active' : 'No plan'}
        </Badge>
      </td>

      {/* Account status */}
      <td className="px-4 py-3">
        <Badge dot variant={owner.is_active ? 'success' : 'danger'}>
          {owner.is_active ? 'Active' : 'Inactive'}
        </Badge>
      </td>

      {/* Joined */}
      <td className="px-4 py-3 text-[12px] text-text-hint whitespace-nowrap">{joined}</td>

      {/* Actions — client component, calls openView() from context */}
      <td className="px-4 py-3 text-end">
        <ViewOwnerButton ownerId={owner.id} />
      </td>
    </tr>
  );
}

function UsersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
