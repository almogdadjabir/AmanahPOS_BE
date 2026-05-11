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
  topColor: string;
  iconClass: string;
}

function KpiCard({ label, value, sub, icon, topColor, iconClass }: KpiConfig) {
  return (
    <div
      className={cn(
        "relative bg-card rounded-xl border border-border border-t-[3px] overflow-hidden",
        "shadow-card p-5 flex flex-col gap-3 group hover:shadow-card-md transition-shadow duration-200",
        topColor,
      )}
    >
      <div className="flex items-start justify-between">
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground leading-none pt-0.5 select-none">
          {label}
        </p>
        <span
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
            "[&_svg]:size-[15px]",
            iconClass,
          )}
        >
          {icon}
        </span>
      </div>

      <div>
        <p className="text-[32px] font-black text-foreground leading-none tabular-nums tracking-tight">
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
  const hasExpired = stats.expired_subscriptions > 0;

  const cards: KpiConfig[] = [
    {
      label: t("kpi.totalOwners"),
      value: fmt.format(stats.total_owners),
      sub: `+${fmt.format(stats.new_owners_this_month)} ${t("kpi.totalOwnersSub")}`,
      icon: <Users />,
      topColor: "border-t-primary",
      iconClass: "bg-primary/10 text-primary",
    },
    {
      label: t("kpi.totalBusinesses"),
      value: fmt.format(stats.total_businesses),
      sub: `${fmt.format(stats.total_shops)} ${t("kpi.totalBusinessesSub")}`,
      icon: <Store />,
      topColor: "border-t-info",
      iconClass: "bg-info/10 text-info",
    },
    {
      label: t("kpi.activeSubscriptions"),
      value: fmt.format(stats.active_subscriptions),
      sub: t("kpi.activeSubscriptionsSub"),
      icon: <CreditCard />,
      topColor: "border-t-success",
      iconClass: "bg-success/10 text-success",
    },
    {
      label: t("kpi.expiredSubscriptions"),
      value: fmt.format(stats.expired_subscriptions),
      sub: hasExpired
        ? t("kpi.expiredSubscriptionsSub")
        : t("kpi.noExpiredSub"),
      icon: <AlertTriangle />,
      topColor: hasExpired ? "border-t-destructive" : "border-t-success",
      iconClass: hasExpired
        ? "bg-destructive/10 text-destructive"
        : "bg-success/10 text-success",
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
