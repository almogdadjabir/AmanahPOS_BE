import { fetchAdminSubscriptions } from "@/services/admin";
import { ApiError } from "@/lib/api";
import type { AdminSubscription } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import EmptyState from "@/components/ds/EmptyState";
import Pagination from "@/components/ds/Pagination";
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
} from "@/components/ui/table";
import ViewSubscriptionButton from "./ViewSubscriptionButton";
import { CreditCard, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getLocale, getTranslations } from "next-intl/server";

interface Props {
  search?: string;
  status?: string;
  page?: number;
}

export default async function SubscriptionsTable({ search, status, page = 1 }: Props) {
  const [t, locale] = await Promise.all([
    getTranslations("subscriptions"),
    getLocale(),
  ]);

  let data;
  try {
    const s = status === "active" || status === "expired" ? status : "all";
    data = await fetchAdminSubscriptions({
      search: search || undefined,
      status: s,
      ordering: "-created_at",
      page,
      page_size: 20,
    });
  } catch (err) {
    const httpStatus = err instanceof ApiError ? err.status : null;
    return (
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
          icon={<CreditCard />}
          title={search ? t("empty.titleSearch") : t("empty.title")}
          description={search ? t("empty.descSearch") : t("empty.desc")}
        />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      {/* Count bar — Fix #8: 32px rounded-[9px] neutral chip */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
        <span className="w-[32px] h-[32px] rounded-[9px] bg-muted flex items-center justify-center [&_svg]:size-[15px] text-muted-foreground shrink-0">
          <CreditCard />
        </span>
        <p className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-widest select-none">
          {data.count.toLocaleString(locale)} {t("countLabel")}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border/60">
            {[
              t("columns.business"), t("columns.owner"), t("columns.plan"),
              t("columns.period"), t("columns.status"), t("columns.daysLeft"), "",
            ].map((h, i) => (
              <TableHead key={i}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.results.map((sub) => (
            <SubscriptionRow key={sub.id} sub={sub} t={t} locale={locale} />
          ))}
        </TableBody>
      </Table>

      <Pagination count={data.count} pageSize={20} />
    </div>
  );
}

function SubscriptionRow({
  sub, t, locale,
}: {
  sub: AdminSubscription;
  t: Awaited<ReturnType<typeof getTranslations>>;
  locale: string;
}) {
  const startDate = new Date(sub.start_date).toLocaleDateString(locale, {
    month: "short", day: "numeric",
  });
  const endDate = new Date(sub.end_date).toLocaleDateString(locale, {
    month: "short", day: "numeric", year: "numeric",
  });

  const price  = parseFloat(sub.plan_price);
  const isDemo = price === 0;

  // Fix #9: derive variant cleanly, no inline Badge className overrides
  const statusVariant = sub.is_expired ? "danger" : sub.is_active ? "success" : "warning";
  const statusLabel   = sub.is_expired
    ? t("status.expired")
    : sub.is_active
      ? t("status.active")
      : t("status.inactive");

  // Days-left chip DS token classes — Fix #6: no raw destructive/warning/success slash
  const daysChipCls = sub.is_expired
    ? "bg-danger-light text-danger"
    : sub.days_remaining <= 7
      ? "bg-warning-light text-warning"
      : "bg-success-light text-success";

  return (
    <TableRow className="group hover:bg-muted/40 transition-colors">
      {/* Business */}
      <TableCell>
        <div className="flex items-center gap-2.5">
          {/* Fix #6: neutral avatar, not bg-warning/10 — warning reserved for status only */}
          <div className={cn(
            "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
            sub.is_expired ? "bg-muted" : "bg-primary-tint",
          )}>
            <span className={cn(
              "text-[12px] font-semibold uppercase",
              sub.is_expired ? "text-muted-foreground" : "text-primary-700",
            )}>
              {sub.business_name.charAt(0)}
            </span>
          </div>
          <p className="text-[13px] font-semibold text-foreground truncate max-w-[140px]">
            {sub.business_name}
          </p>
        </div>
      </TableCell>

      {/* Owner */}
      <TableCell>
        <p className="text-[13px] font-medium text-foreground leading-tight">
          {sub.owner_name || (
            <span className="text-muted-foreground italic text-xs">{t("noName")}</span>
          )}
        </p>
        <span className="inline-flex items-center px-1.5 py-0.5 mt-0.5 rounded bg-muted text-[10px] font-mono text-muted-foreground">
          {sub.owner_phone}
        </span>
      </TableCell>

      {/* Plan */}
      <TableCell>
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-[13px] font-semibold text-foreground">{sub.plan_name}</p>
          {/* Fix #9: clean Badge variant, no inline overrides */}
          {isDemo && (
            <Badge variant="default" className="text-[10px]">{t("plan.demo")}</Badge>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {isDemo ? t("plan.freeAccess") : `${price.toFixed(2)} ${sub.plan_currency}`}
        </p>
      </TableCell>

      {/* Period */}
      <TableCell>
        <p className="text-[12px] text-muted-foreground whitespace-nowrap">
          {locale === "ar"
            ? `${endDate} ← ${startDate}`
            : `${startDate} → ${endDate}`}
        </p>
      </TableCell>

      {/* Status — Fix #9: clean dot Badge */}
      <TableCell>
        <Badge dot variant={statusVariant}>{statusLabel}</Badge>
      </TableCell>

      {/* Days left — Fix #6: DS token classes */}
      <TableCell>
        <span className={cn(
          "inline-flex items-center rounded-md px-2 py-0.5 text-[12px] font-semibold",
          daysChipCls,
        )}>
          {sub.is_expired
            ? t("days.expired")
            : t("days.leftShort", { count: sub.days_remaining })}
        </span>
      </TableCell>

      {/* Action */}
      <TableCell className="text-end">
        <ViewSubscriptionButton subscriptionId={sub.id} />
      </TableCell>
    </TableRow>
  );
}
