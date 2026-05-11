import { fetchAdminBusinesses } from "@/services/admin";
import { ApiError } from "@/lib/api";
import type { AdminBusiness } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ds/EmptyState";
import Pagination from "@/components/ds/Pagination";
import { getLocale, getTranslations } from "next-intl/server";
import {
  Table,
  TableHeader,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
} from "@/components/ui/table";
import ViewBusinessButton from "./ViewBusinessButton";
import { Store, ShoppingBag, CreditCard, UtensilsCrossed } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  search?: string;
  status?: string;
  sub?: string;
  page?: number;
}

export default async function BusinessesTable({
  search,
  status,
  sub,
  page = 1,
}: Props) {
  const [t, locale] = await Promise.all([
    getTranslations("businesses"),
    getLocale(),
  ]);

  let data;
  try {
    data = await fetchAdminBusinesses({
      search: search || undefined,
      is_active:
        status === "active" ? true : status === "inactive" ? false : undefined,
      has_subscription: sub === "yes" ? true : sub === "no" ? false : undefined,
      ordering: "-created_at",
      page,
      page_size: 20,
    });
  } catch (err) {
    const status = err instanceof ApiError ? err.status : null;
    const body =
      err instanceof ApiError ? JSON.stringify(err.body) : String(err);
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-10 text-center">
        <p className="text-sm font-semibold text-destructive">
          {t("error.failedToLoad")}
        </p>
        <p className="text-xs text-destructive/70 mt-1">
          {status ? `HTTP ${status}` : t("error.network")} —{" "}
          {t("error.checkLogs")}
          details.
        </p>
        {process.env.NODE_ENV === "development" && (
          <pre className="mt-3 text-left text-[10px] bg-destructive/10 rounded p-2 overflow-x-auto text-destructive/80 max-h-32">
            {body}
          </pre>
        )}
      </div>
    );
  }

  if (data.results.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-card">
        <EmptyState
          icon={<Store />}
          title={search ? t("empty.titleSearch") : t("empty.title")}
          description={search ? t("empty.descSearch") : t("empty.desc")}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-card overflow-hidden">
      {/* Count bar */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
        <span className="w-5 h-5 rounded-md bg-info/10 text-info flex items-center justify-center [&_svg]:size-3">
          <Store />
        </span>
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.1em]">
          {data.count.toLocaleString(locale)} {t("countLabel")}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border/60">
            {[
              t("columns.business"),
              t("columns.owner"),
              t("columns.shops"),
              t("columns.subscription"),
              t("columns.status"),
              t("columns.created"),
              "",
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
  biz,
  t,
  locale,
}: {
  biz: AdminBusiness;
  t: Awaited<ReturnType<typeof getTranslations>>;
  locale: string;
}) {
  const created = new Date(biz.created_at).toLocaleDateString(locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const subExpiry = biz.subscription_end_date
    ? new Date(biz.subscription_end_date).toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
      })
    : null;

  const daysLeft = biz.subscription_end_date
    ? Math.ceil(
        (new Date(biz.subscription_end_date).getTime() - Date.now()) /
          86_400_000,
      )
    : null;

  return (
    <TableRow className="group hover:bg-muted/40 transition-colors">
      {/* Business name */}
      <TableCell>
        <div className="flex items-center gap-2.5">
          <div className="relative shrink-0">
            <div
              className={cn(
                "w-8 h-8 rounded-lg flex items-center justify-center",
                biz.is_active ? "bg-info/10" : "bg-muted",
              )}
            >
              <span
                className={cn(
                  "text-[13px] font-black uppercase",
                  biz.is_active ? "text-info" : "text-muted-foreground",
                )}
              >
                {biz.name.charAt(0)}
              </span>
            </div>
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-card",
                biz.is_active ? "bg-success" : "bg-muted-foreground/50",
              )}
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
                {biz.name}
              </p>
              {biz.business_type === "restaurant" && (
                <span className="shrink-0 inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600">
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
            <span className="text-muted-foreground italic text-xs">
              {t("noName")}
            </span>
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
          <span className="text-sm font-semibold text-foreground">
            {biz.shop_count}
          </span>
        </div>
      </TableCell>

      {/* Subscription */}
      <TableCell>
        <div className="flex flex-col items-start gap-1">
          <Badge
            variant={biz.has_active_subscription ? "success" : "secondary"}
            className={cn(
              "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
              biz.has_active_subscription
                ? "bg-success/10 text-success border-success/20"
                : "bg-muted text-muted-foreground border-border",
            )}
          >
            {biz.has_active_subscription
              ? t("subscription.active")
              : t("subscription.noPlan")}
          </Badge>

          {subExpiry && daysLeft !== null && (
            <span
              className={cn(
                "text-[10px] font-medium leading-none",
                daysLeft <= 7 ? "text-warning" : "text-muted-foreground",
              )}
            >
              {t("subscription.expires", { date: subExpiry })}
            </span>
          )}
        </div>
      </TableCell>

      {/* Status */}
      <TableCell>
        <Badge
          variant={biz.is_active ? "success" : "danger"}
          className={cn(
            "rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
            biz.is_active
              ? "bg-success/10 text-success border-success/20"
              : "bg-destructive/10 text-destructive border-destructive/20",
          )}
        >
          {biz.is_active ? t("status.active") : t("status.inactive")}
        </Badge>
      </TableCell>

      {/* Created */}
      <TableCell>
        <span className="text-xs text-muted-foreground whitespace-nowrap">
          {created}
        </span>
      </TableCell>

      {/* Action */}
      <TableCell className="text-end">
        <ViewBusinessButton businessId={biz.id} />
      </TableCell>
    </TableRow>
  );
}
