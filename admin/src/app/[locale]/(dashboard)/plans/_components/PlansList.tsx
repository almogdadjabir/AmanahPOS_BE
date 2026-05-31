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
    const body =
      err instanceof ApiError ? JSON.stringify(err.body) : String(err);

    console.error("[PlansList] fetch failed", { httpStatus, body });

    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-10 text-center">
        <p className="text-sm font-semibold text-destructive">
          {t("error.failedToLoad")}
        </p>

        <p className="text-xs text-destructive/70 mt-1">
          {httpStatus ? `HTTP ${httpStatus}` : t("error.network")} —{" "}
          {t("error.checkLogs")}
        </p>

        {process.env.NODE_ENV === "development" && (
          <pre className="mt-3 text-left text-[10px] bg-destructive/10 rounded p-2 overflow-x-auto text-destructive/80 max-h-32">
            {body}
          </pre>
        )}
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
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
    <div className="space-y-6">
      {paidPlans.length > 0 && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-5 h-5 rounded-md bg-success/10 text-success flex items-center justify-center [&_svg]:size-3">
              <Package />
            </span>

            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
              {t("sections.paidPlans")} ·{" "}
              {paidPlans.length.toLocaleString(locale)}
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
            <span className="w-5 h-5 rounded-md bg-info/10 text-info flex items-center justify-center [&_svg]:size-3">
              <Package />
            </span>

            <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
              {t("sections.demoAccess")} ·{" "}
              {demoPlans.length.toLocaleString(locale)}
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
    <div
      className={cn(
        "group relative rounded-xl border bg-card shadow-card overflow-hidden transition-shadow hover:shadow-md",
        plan.is_active ? "border-border" : "border-border/40 opacity-60",
      )}
    >
      <div
        className={cn(
          "h-1 w-full",
          plan.is_free
            ? "bg-gradient-to-r from-info/60 to-info/20"
            : plan.is_active
              ? "bg-gradient-to-r from-success/60 to-success/20"
              : "bg-muted",
        )}
      />

      <div className="p-5">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            <div
              className={cn(
                "w-9 h-9 rounded-xl flex items-center justify-center shrink-0",
                plan.is_free
                  ? "bg-info/10"
                  : plan.is_active
                    ? "bg-success/10"
                    : "bg-muted",
              )}
            >
              <Package
                size={16}
                className={
                  plan.is_free
                    ? "text-info"
                    : plan.is_active
                      ? "text-success"
                      : "text-muted-foreground"
                }
              />
            </div>

            <div className="min-w-0">
              <p className="text-[14px] font-bold text-foreground truncate leading-tight">
                {plan.name}
              </p>

              {plan.description && (
                <p className="text-[11px] text-muted-foreground truncate mt-0.5">
                  {plan.description}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-1 shrink-0">
            <Badge
              variant={plan.is_active ? "success" : "warning"}
              className={cn(
                "rounded-full border px-2.5 py-0.5 text-[10px] font-semibold",
                plan.is_active
                  ? "bg-success/10 text-success border-success/20"
                  : "bg-muted text-muted-foreground border-border",
              )}
            >
              {plan.is_active ? t("status.active") : t("status.off")}
            </Badge>

            {plan.is_free && (
              <Badge
                variant="info"
                className="rounded-full border border-info/20 bg-info/10 px-2 py-0.5 text-[9px] font-bold text-info"
              >
                {t("plan.demo")}
              </Badge>
            )}
          </div>
        </div>

        <div
          className={cn(
            "rounded-xl px-3 py-2.5 mb-3",
            plan.is_free
              ? "bg-info/5 border border-info/10"
              : "bg-success/5 border border-success/10",
          )}
        >
          {plan.is_free ? (
            <p className="text-[13px] font-bold text-info">
              {t("plan.freeDemo")}
            </p>
          ) : (
            <div className="flex items-baseline gap-1">
              <p className="text-[22px] font-black text-success leading-none tabular-nums">
                {formattedPrice}
              </p>

              <p className="text-[11px] font-semibold text-muted-foreground">
                {plan.currency} /{" "}
                {t("duration.short", { count: plan.duration_days })}
              </p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1.5 mb-3">
          <LimitBadge
            icon={<Store size={10} />}
            label={t("limits.shops")}
            value={plan.max_shops}
          />
          <LimitBadge
            icon={<ShoppingBag size={10} />}
            label={t("limits.products")}
            value={plan.max_products}
          />
          <LimitBadge
            icon={<Users size={10} />}
            label={t("limits.users")}
            value={plan.max_users}
          />
        </div>

        <div className="flex items-center justify-between pt-2.5 border-t border-border/60">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock size={10} />
              <span>{t("duration.short", { count: plan.duration_days })}</span>
            </div>

            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <CreditCard size={10} />
              <span>
                {t("subscriptionCount", {
                  count: plan.subscription_count,
                })}
              </span>
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
    <div className="flex flex-col items-center gap-0.5 rounded-lg border border-border bg-muted/20 px-2 py-1.5">
      <div className="flex items-center gap-1 text-muted-foreground">
        {icon}
      </div>

      <p className="text-[12px] font-bold text-foreground">{value}</p>

      <p className="text-[9px] text-muted-foreground uppercase tracking-[0.05em]">
        {label}
      </p>
    </div>
  );
}
