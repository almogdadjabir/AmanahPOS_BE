import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import type { AdminOwner } from "@/types/api";
import type { AdminStats } from "./types";

type Props = {
  stats: AdminStats;
};

export default function AdminRecentOwners({ stats }: Props) {
  return (
    <div className="bg-white rounded-xl border border-border-soft shadow-card p-4 flex flex-col min-h-[260px]">
      <div className="flex items-start justify-between mb-3">
        <div>
          <p className="text-[13px] font-semibold text-text-primary">
            Recent Owners
          </p>
          <p className="text-xs text-text-hint mt-0.5">Latest registrations</p>
        </div>

        {stats && stats.total_owners > 0 && (
          <Badge dot variant="info">
            {stats.total_owners.toLocaleString("en-US")}
          </Badge>
        )}
      </div>

      {!stats ? (
        <RecentOwnersSkeleton />
      ) : stats.recent_owners.length === 0 ? (
        <RecentOwnersEmpty />
      ) : (
        <div className="flex-1 space-y-1.5 overflow-y-auto pr-1">
          {stats.recent_owners.map((owner) => (
            <OwnerRow key={owner.id} owner={owner} />
          ))}
        </div>
      )}
    </div>
  );
}

function OwnerRow({ owner }: { owner: AdminOwner }) {
  const status = getOwnerStatus(owner);
  const ownerName = owner.full_name || owner.phone;

  return (
    <div className="group flex items-center gap-2.5 p-2 rounded-lg hover:bg-surface-soft transition-colors">
      <Avatar name={ownerName} size={28} />

      <div className="flex-1 min-w-0">
        <p className="text-[12px] font-semibold text-text-primary truncate">
          {ownerName}
        </p>

        <p className="text-[11px] text-text-hint">
          {owner.business_count}{" "}
          {owner.business_count === 1 ? "business" : "businesses"}
        </p>
      </div>

      <Badge dot variant={status.variant} className="shrink-0">
        {status.label}
      </Badge>
    </div>
  );
}

function getOwnerStatus(owner: AdminOwner): {
  label: string;
  variant: "success" | "warning" | "danger";
} {
  if (owner.has_active_subscription) {
    return {
      label: "Active",
      variant: "success",
    };
  }

  if (owner.is_active) {
    return {
      label: "No sub",
      variant: "warning",
    };
  }

  return {
    label: "Inactive",
    variant: "danger",
  };
}

function RecentOwnersSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="h-10 bg-surface-muted rounded-lg animate-pulse"
        />
      ))}
    </div>
  );
}

function RecentOwnersEmpty() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-6 text-center">
      <div className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-surface-soft text-text-hint">
        <UsersMiniIcon />
      </div>

      <p className="text-[13px] font-medium text-text-primary">No owners yet</p>

      <p className="text-xs text-text-hint mt-1">
        Register the first owner to get started.
      </p>
    </div>
  );
}

function UsersMiniIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
