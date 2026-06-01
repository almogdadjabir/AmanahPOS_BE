import { fetchAdminPlans } from "@/services/admin";
import { ApiError } from "@/lib/api";
import type { AdminPlan } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ds/EmptyState";
import ViewPlanButton from "./ViewPlanButton";
import {
  Package,
  Store,
  ShoppingBag,
  Users,
  Clock,
  CreditCard,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getLocale, getTranslations } from "next-intl/server";

export default async function PlansList() {
  const [t, locale] = await Promise.all([
    getTranslations("plans"),
    getLocale(),
  ]);

  let plans: AdminPlan[];

  try {
    plans = await fetchAdminPlans();
  } catch (err) {
    const httpStatus = err instanceof ApiError ? err.status : null;

    return (
      <div className="bg-card rounded-xl border border-border shadow-xs p-8 flex flex-col items-center text-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <AlertTriangle className="size-4 text-muted-foreground" />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-foreground">
            {t("error.failedToLoad")}
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {httpStatus ? `HTTP ${httpStatus}` : t("error.network")} — {t("error.checkLogs")}
          </p>
        </div>
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-xs">
        <EmptyState
          icon={<Package />}
          title={t("empty.title")}
          description={t("empty.desc")}
        />
      </div>
    );
  }

  const paidPlans = plans.filter((p) => !p.is_free);
  const demoPlans = plans.filter((p) => p.is_free);

  return (
    <div className="space-y-4">
      {paidPlans.length > 0 && (
        <section>
          {/* Fix #8: uniform 32px rounded-[9px] section icon chip */}
          <div className="flex items-center gap-2 mb-3">
            <span className="w-[32px] h-[32px] rounded-[9px] bg-success-light flex items-center justify-center [&_svg]:size-[15px] text-success shrink-0">
              <Package />
            </span>
            <p className="text-[11.5px] font-semibold uppercase tracking-widest text-muted-foreground select-none">
              {t("sections.paidPlans")} · {paidPlans.length.toLocaleString(locale)}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {paidPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} t={t} locale={locale} />
            ))}
          </div>
        </section>
      )}

      {demoPlans.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-[32px] h-[32px] rounded-[9px] bg-muted flex items-center justify-center [&_svg]:size-[15px] text-muted-foreground shrink-0">
              <Package />
            </span>
            <p className="text-[11.5px] font-semibold uppercase tracking-widest text-muted-foreground select-none">
              {t("sections.demoAccess")} · {demoPlans.length.toLocaleString(locale)}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {demoPlans.map((plan) => (
              <PlanCard key={plan.id} plan={plan} t={t} locale={locale} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function PlanCard({
  plan,
  t,
  locale,
}: {
  plan: AdminPlan;
  t: Awaited<ReturnType<typeof getTranslations>>;
  locale: string;
}) {
  const price = parseFloat(plan.price);
  const formattedPrice = price % 1 === 0 ? price.toFixed(0) : price.toFixed(2);

  return (
    // Fix #5: no border-t accent bar — border + shadow-xs only
    // Fix #9: opacity-60 for inactive instead of separate styling
    <div
      className={cn(
        "bg-card rounded-xl border border-border shadow-xs overflow-hidden flex flex-col",
        "hover:shadow-card hover:-translate-y-px transition-[box-shadow,transform] duration-200 cursor-default",
        !plan.is_active && "opacity-60",
      )}
    >
      <div className="p-5 flex flex-col gap-3 flex-1">
        {/* Header: name + status badge */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            {/* Fix #8: 32px rounded-[9px] icon chip */}
            <span
              className={cn(
                "w-[32px] h-[32px] rounded-[9px] flex items-center justify-center shrink-0 [&_svg]:size-[15px]",
                plan.is_free
                  ? "bg-muted [&_svg]:text-muted-foreground"
                  : plan.is_active
                    ? "bg-success-light [&_svg]:text-success"
                    : "bg-muted [&_svg]:text-muted-foreground",
              )}
            >
              <Package />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-semibold text-foreground truncate leading-tight tracking-[-.015em]">
                {plan.name}
              </p>
              {plan.description && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {plan.description}
                </p>
              )}
            </div>
          </div>

          {/* Fix #9: clean Badge variant, no inline overrides */}
          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge dot variant={plan.is_active ? "success" : "default"}>
              {plan.is_active ? t("status.active") : t("status.off")}
            </Badge>
            {plan.is_free && (
              <Badge variant="default" className="text-[10px]">
                {t("plan.demo")}
              </Badge>
            )}
          </div>
        </div>

        {/* Price block — simplified, no colored border */}
        <div className="bg-muted/40 rounded-lg px-3 py-2.5">
          {plan.is_free ? (
            <p className="text-[12px] font-semibold text-muted-foreground">
              {t("plan.freeDemo")}
            </p>
          ) : (
            <div className="flex items-baseline gap-1">
              {/* Fix #7: tabular, tracking tight */}
              <p className="text-[22px] font-semibold text-foreground leading-none tabular-nums tracking-[-.03em] num">
                {formattedPrice}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {plan.currency} / {t("duration.short", { count: plan.duration_days })}
              </p>
            </div>
          )}
        </div>

        {/* Limits row */}
        <div className="grid grid-cols-3 gap-1.5">
          <LimitBadge icon={<Store />}       label={t("limits.shops")}    value={plan.max_shops} />
          <LimitBadge icon={<ShoppingBag />} label={t("limits.products")} value={plan.max_products} />
          <LimitBadge icon={<Users />}       label={t("limits.users")}    value={plan.max_users} />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2.5 border-t border-border/60 mt-auto">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-[10px]" />
              <span>{t("duration.short", { count: plan.duration_days })}</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <CreditCard className="size-[10px]" />
              <span>{t("subscriptionCount", { count: plan.subscription_count })}</span>
            </div>
          </div>
          <ViewPlanButton planId={plan.id} />
        </div>
      </div>
    </div>
  );
}

function LimitBadge({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-lg bg-muted/60 px-2 py-1.5">
      <span className="[&_svg]:size-[10px] text-muted-foreground">{icon}</span>
      <p className="text-[12px] font-semibold text-foreground tabular-nums num">{value}</p>
      <p className="text-[9px] text-muted-foreground uppercase tracking-[0.05em] select-none">
        {label}
      </p>
    </div>
  );
}
