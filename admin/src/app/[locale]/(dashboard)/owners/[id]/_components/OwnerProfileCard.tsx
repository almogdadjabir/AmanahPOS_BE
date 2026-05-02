import Avatar from "@/components/ui/Avatar";
import Badge from "@/components/ui/Badge";
import type { AdminOwnerDetail } from "@/types/api";

import { EditOwnerForm, ToggleStatusButton } from "./OwnerActions";
import OwnerStatChip from "./OwnerStatChip";
import {
  CalendarIcon,
  ClockIcon,
  MailIcon,
  PhoneIcon,
} from "./ownerDetail.icons";

type Props = {
  owner: AdminOwnerDetail;
};

export default function OwnerProfileCard({ owner }: Props) {
  const ownerName = owner.full_name || owner.phone;

  const joined = new Date(owner.created_at).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const lastSeen = owner.last_login_at
    ? new Date(owner.last_login_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="bg-white rounded-xl border border-border-soft shadow-card p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-4">
          <Avatar name={ownerName} size={52} />

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-[17px] font-bold text-text-primary leading-tight">
                {owner.full_name || (
                  <span className="text-text-hint italic">No name set</span>
                )}
              </h1>

              <Badge dot variant={owner.is_active ? "success" : "danger"}>
                {owner.is_active ? "Active" : "Inactive"}
              </Badge>

              {owner.is_verified && <Badge variant="info">Verified</Badge>}
            </div>

            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
              <MetaItem icon={<PhoneIcon />} label={owner.phone} mono />

              {owner.email && (
                <MetaItem icon={<MailIcon />} label={owner.email} />
              )}

              <MetaItem icon={<CalendarIcon />} label={`Joined ${joined}`} />

              {lastSeen && (
                <MetaItem
                  icon={<ClockIcon />}
                  label={`Last seen ${lastSeen}`}
                />
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <EditOwnerForm owner={owner} />
          <ToggleStatusButton owner={owner} />
        </div>
      </div>

      <div className="mt-5 pt-4 border-t border-border-soft grid grid-cols-2 sm:grid-cols-4 gap-4">
        <OwnerStatChip
          label="Businesses"
          value={String(owner.business_count)}
          accent="text-primary"
        />

        <OwnerStatChip
          label="Subscription"
          value={owner.has_active_subscription ? "Active" : "No plan"}
          accent={
            owner.has_active_subscription ? "text-success" : "text-warning"
          }
        />

        <OwnerStatChip
          label="Verified"
          value={owner.is_verified ? "Yes" : "No"}
          accent={owner.is_verified ? "text-success" : "text-text-hint"}
        />

        <OwnerStatChip
          label="Has password"
          value={owner.has_password ? "Set" : "OTP only"}
          accent={owner.has_password ? "text-text-primary" : "text-text-hint"}
        />
      </div>
    </div>
  );
}

function MetaItem({
  icon,
  label,
  mono,
}: {
  icon: React.ReactNode;
  label: string;
  mono?: boolean;
}) {
  return (
    <span
      className={`flex items-center gap-1.5 text-[12px] text-text-secondary ${
        mono ? "font-mono" : ""
      }`}
    >
      <span className="text-text-hint">{icon}</span>
      {label}
    </span>
  );
}
