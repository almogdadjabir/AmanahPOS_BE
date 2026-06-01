import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import { getTranslations } from "next-intl/server";
import type { AdminStats } from "./types";
import { Users, Store, CreditCard, AlertTriangle } from "lucide-react";

type Props = { stats: AdminStats };

interface KpiConfig {
  label: string;
  value: string;
  sub: string;
  icon: React.ReactNode;
  iconClass: string;
}

function KpiCard({ label, value, sub, icon, iconClass }: KpiConfig) {
  return (
    // Fix #5: no border-t accent bar — border + shadow-xs only
    <div
      className={cn(
        "bg-card rounded-xl border border-border shadow-xs p-5 flex flex-col gap-3",
        "hover:shadow-card hover:-translate-y-px transition-[box-shadow,transform] duration-200 cursor-default",
      )}
    >
      <div className="flex items-start justify-between">
        {/* Fix #18: table-header-style label */}
        <p className="text-[10.5px] font-semibold uppercase tracking-wider text-muted-foreground leading-none pt-0.5 select-none">
          {label}
        </p>
        {/* Fix #8: unified icon chip — 32px, rounded-[9px] */}
        <span
          className={cn(
            "w-[32px] h-[32px] rounded-[9px] flex items-center justify-center shrink-0",
            "[&_svg]:size-[15px]",
            iconClass,
          )}
        >
          {icon}
        </span>
      </div>

      <div>
        {/* Fix #7: font-semibold 600, 27px, tight tracking, tabular */}
        <p className="text-[27px] font-semibold text-foreground leading-none tabular-nums tracking-[-.03em] num">
          {value}
        </p>
        <p className="text-[11px] text-muted-foreground mt-2 leading-snug">
          {sub}
        </p>
      </div>
    </div>
  );
}

export default async function AdminKpiCards({ stats }: Props) {
  if (!stats) return <KpiCardsSkeleton />;

  const t = await getTranslations("dashboard");
  const fmt = new Intl.NumberFormat("en-US");

  // Fix #6: no blue anywhere — neutral/teal/amber set only
  const cards: KpiConfig[] = [
    {
      label: t("kpi.totalOwners"),
      value: fmt.format(stats.total_owners),
      sub: `+${fmt.format(stats.new_owners_this_month)} ${t("kpi.totalOwnersSub")}`,
      icon: <Users />,
      iconClass: "bg-primary-tint [&_svg]:text-primary",
    },
    {
      label: t("kpi.totalBusinesses"),
      value: fmt.format(stats.total_businesses),
      sub: `${fmt.format(stats.total_shops)} ${t("kpi.totalBusinessesSub")}`,
      icon: <Store />,
      // Fix #6: no blue — neutral gray
      iconClass: "bg-muted [&_svg]:text-muted-foreground",
    },
    {
      label: t("kpi.activeSubscriptions"),
      value: fmt.format(stats.active_subscriptions),
      sub: t("kpi.activeSubscriptionsSub"),
      icon: <CreditCard />,
      iconClass: "bg-success-light [&_svg]:text-success",
    },
    {
      label: t("kpi.expiredSubscriptions"),
      value: fmt.format(stats.expired_subscriptions),
      sub:
        stats.expired_subscriptions > 0
          ? t("kpi.expiredSubscriptionsSub")
          : t("kpi.noExpiredSub"),
      icon: <AlertTriangle />,
      // Fix #6: neutral gray — the value itself communicates severity, not the chip
      iconClass: "bg-muted [&_svg]:text-muted-foreground",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card) => (
        <KpiCard key={card.label} {...card} />
      ))}
    </div>
  );
}

function KpiCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-[116px] rounded-xl" />
      ))}
    </div>
  );
}
