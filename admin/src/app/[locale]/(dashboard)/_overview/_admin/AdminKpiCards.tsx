import StatCard from "@/components/ds/StatCard";
import type { AdminStats } from "./types";
import { AlertIcon, CreditIcon, StoreIcon, UsersIcon } from "./icons";

type Props = {
  stats: AdminStats;
};

export default function AdminKpiCards({ stats }: Props) {
  if (!stats) {
    return <KpiCardsSkeleton />;
  }

  const numberFormatter = new Intl.NumberFormat("en-US");

  const cards = [
    {
      label: "Total Owners",
      value: numberFormatter.format(stats.total_owners),
      sub: `${numberFormatter.format(stats.new_owners_this_month)} new this month`,
      icon: <UsersIcon />,
      accent: "text-primary bg-primary-soft",
    },
    {
      label: "Total Businesses",
      value: numberFormatter.format(stats.total_businesses),
      sub: `${numberFormatter.format(stats.total_shops)} active shops`,
      icon: <StoreIcon />,
      accent: "text-info bg-info-light",
    },
    {
      label: "Active Subscriptions",
      value: numberFormatter.format(stats.active_subscriptions),
      sub: "paying customers",
      icon: <CreditIcon />,
      accent: "text-success bg-success-light",
    },
    {
      label: "Expired Subscriptions",
      value: numberFormatter.format(stats.expired_subscriptions),
      sub:
        stats.expired_subscriptions > 0
          ? "needs follow-up"
          : "all subscriptions healthy",
      icon: <AlertIcon />,
      accent:
        stats.expired_subscriptions > 0
          ? "text-danger bg-danger-light"
          : "text-success bg-success-light",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <StatCard
          key={card.label}
          label={card.label}
          value={card.value}
          sub={card.sub}
          icon={card.icon}
          accent={card.accent}
        />
      ))}
    </div>
  );
}

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="bg-surface-muted rounded-xl border border-border-soft shadow-card p-4 h-24 animate-pulse"
        />
      ))}
    </div>
  );
}
