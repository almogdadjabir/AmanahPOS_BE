import { fetchAdminBusinesses } from "@/services/admin";
import { ApiError } from "@/lib/api";
import type { AdminBusiness } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ds/EmptyState";
import Pagination from "@/components/ds/Pagination";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
} from "@/components/ui/table";
import ViewBusinessButton from "./ViewBusinessButton";
import { Store, ShoppingBag, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  search?: string;
  status?: string;
  sub?: string;
  page?: number;
}

export default async function BusinessesTable({ search, status, sub, page = 1 }: Props) {
  const [t, locale] = await Promise.all([
    getTranslations("businesses"),
    getLocale(),
  ]);

  let data;
  try {
    data = await fetchAdminBusinesses({
      search: search || undefined,
      is_active: status === "active" ? true : status === "inactive" ? false : undefined,
      has_subscription: sub === "yes" ? true : sub === "no" ? false : undefined,
      ordering: "-created_at",
      page,
      page_size: 20,
    });
  } catch (err) {
    const httpStatus = err instanceof ApiError ? err.status : null;
    return (
      /* Fix: muted/foreground error pattern, no raw destructive */
      <div className="bg-card rounded-xl border border-border shadow-xs p-8 flex flex-col items-center text-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <AlertTriangle className="size-4 text-muted-foreground" />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-foreground">{t("error.failedToLoad")}</p>
          <p className="text-[11px] text-muted-foreground mt-1">
            {httpStatus ? `HTTP ${httpStatus}` : t("error.network")} — {t("error.checkLogs")}
          </p>
        </div>
      </div>
    );
  }

  if (data.results.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-xs">
        <EmptyState
          icon={<Store />}
          title={search ? t("empty.titleSearch") : t("empty.title")}
          description={search ? t("empty.descSearch") : t("empty.desc")}
        />
      </div>
    );
  }

  return (
    /* Fix: shadow-xs */
    <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      {/* Count bar — Fix #8: 32px rounded-[9px] chip */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
        <span className="w-[32px] h-[32px] rounded-[9px] bg-muted flex items-center justify-center [&_svg]:size-[15px] text-muted-foreground shrink-0">
          <Store />
        </span>
        <p className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-widest select-none">
          {data.count.toLocaleString(locale)} {t("countLabel")}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border/60">
            {[
              t("columns.business"), t("columns.owner"), t("columns.shops"),
              t("columns.subscription"), t("columns.status"), t("columns.created"), "",
            ].map((h, i) => (
              <TableHead key={i}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.results.map((biz) => (
            <BusinessRow key={biz.id} biz={biz} t={t} locale={locale} />
          ))}
        </TableBody>
      </Table>

      <Pagination count={data.count} pageSize={20} />
    </div>
  );
}

function BusinessRow({
  biz, t, locale,
}: {
  biz: AdminBusiness;
  t: Awaited<ReturnType<typeof getTranslations>>;
  locale: string;
}) {
  const created = new Date(biz.created_at).toLocaleDateString(locale, {
    month: "short", day: "numeric", year: "numeric",
  });

  const subExpiry = biz.subscription_end_date
    ? new Date(biz.subscription_end_date).toLocaleDateString(locale, { month: "short", day: "numeric" })
    : null;

  const daysLeft = biz.subscription_end_date
    ? Math.ceil((new Date(biz.subscription_end_date).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <TableRow className="group hover:bg-muted/40 transition-colors">
      {/* Business name */}
      <TableCell>
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            {/* Fix #6: neutral chip, not bg-info/10 text-info */}
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center",
              biz.is_active ? "bg-primary-tint" : "bg-muted",
            )}>
              <span className={cn(
                "text-[13px] font-semibold uppercase",
                biz.is_active ? "text-primary-700" : "text-muted-foreground",
              )}>
                {biz.name.charAt(0)}
              </span>
            </div>
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
              biz.is_active ? "bg-success" : "bg-muted-foreground/50",
            )} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
                {biz.name}
              </p>
              {/* Fix #6: bg-warning-light text-warning instead of raw amber */}
              {biz.business_type === "restaurant" && (
                <span className="shrink-0 inline-flex items-center text-[9px] font-semibold px-1.5 py-0.5 rounded-full bg-warning-light text-warning">
                  {t("businessType.restaurantShort")}
                </span>
              )}
            </div>
            <p className="text-[10px] font-mono text-muted-foreground mt-0.5 truncate">
              {biz.slug}
            </p>
          </div>
        </div>
      </TableCell>

      {/* Owner */}
      <TableCell>
        <p className="text-[13px] font-medium text-foreground leading-tight">
          {biz.owner_name || (
            <span className="text-muted-foreground italic text-xs">{t("noName")}</span>
          )}
        </p>
        <span className="inline-flex items-center px-1.5 py-0.5 mt-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground">
          {biz.owner_phone}
        </span>
      </TableCell>

      {/* Shops */}
      <TableCell>
        <div className="flex items-center gap-1.5">
          <ShoppingBag className="size-3.5 text-muted-foreground/60" />
          <span className="text-[13px] font-semibold text-foreground tabular-nums num">
            {biz.shop_count}
          </span>
        </div>
      </TableCell>

      {/* Subscription — Fix #9: clean Badge dot variant */}
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <Badge dot variant={biz.has_active_subscription ? "success" : "default"}>
            {biz.has_active_subscription ? t("subscription.active") : t("subscription.noPlan")}
          </Badge>
          {subExpiry && daysLeft !== null && (
            <span className={cn(
              "text-[10px] font-medium leading-none",
              daysLeft <= 7 ? "text-warning" : "text-muted-foreground",
            )}>
              {t("subscription.expires", { date: subExpiry })}
            </span>
          )}
        </div>
      </TableCell>

      {/* Status — Fix #9: clean Badge dot variant */}
      <TableCell>
        <Badge dot variant={biz.is_active ? "success" : "default"}>
          {biz.is_active ? t("status.active") : t("status.inactive")}
        </Badge>
      </TableCell>

      {/* Created */}
      <TableCell>
        <span className="text-[12px] text-muted-foreground whitespace-nowrap">{created}</span>
      </TableCell>

      {/* Action */}
      <TableCell className="text-end">
        <ViewBusinessButton businessId={biz.id} />
      </TableCell>
    </TableRow>
  );
}
