import { fetchAdminOwners } from "@/services/admin";
import { getTranslations } from "next-intl/server";
import type { AdminOwner } from "@/types/api";
import { Badge } from "@/components/ui/badge";
import Avatar from "@/components/ui/Avatar";
import EmptyState from "@/components/ds/EmptyState";
import Pagination from "@/components/ds/Pagination";
import {
  Table, TableHeader, TableHead, TableBody, TableRow, TableCell,
} from "@/components/ui/table";
import ViewOwnerButton from "./ViewOwnerButton";
import { Users, Store, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  search?: string;
  status?: string;
  sub?: string;
  page?: number;
}

export default async function OwnersTable({ search, status, sub, page = 1 }: Props) {
  const t = await getTranslations("owners");
  let data;
  try {
    data = await fetchAdminOwners({
      search: search || undefined,
      is_active: status === "active" ? true : status === "inactive" ? false : undefined,
      has_subscription: sub === "yes" ? true : sub === "no" ? false : undefined,
      ordering: "-created_at",
      page,
      page_size: 20,
    });
  } catch {
    return (
      /* Fix: use muted/foreground pattern, not raw destructive */
      <div className="bg-card rounded-xl border border-border shadow-xs p-8 flex flex-col items-center text-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
          <AlertTriangle className="size-4 text-muted-foreground" />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-foreground">{t("error.failedToLoad")}</p>
          <p className="text-[11px] text-muted-foreground mt-1">{t("error.checkApi")}</p>
        </div>
      </div>
    );
  }

  if (data.results.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-card shadow-xs">
        <EmptyState
          icon={<Users />}
          title={search ? t("empty.titleSearch") : t("empty.title")}
          description={search ? t("empty.descSearch") : t("empty.desc")}
        />
      </div>
    );
  }

  return (
    /* Fix: shadow-xs */
    <div className="rounded-xl border border-border bg-card shadow-xs overflow-hidden">
      {/* Count bar — Fix #8: 32px rounded-[9px] chip + tracking-widest */}
      <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
        <span className="w-[32px] h-[32px] rounded-[9px] bg-muted flex items-center justify-center [&_svg]:size-[15px] text-muted-foreground shrink-0">
          <Users />
        </span>
        <p className="text-[11.5px] font-semibold text-muted-foreground uppercase tracking-widest select-none">
          {data.count.toLocaleString()} {t("title").toLowerCase()}
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent border-b border-border/60">
            {[
              t("columns.owner"), t("columns.phone"), t("columns.businesses"),
              t("columns.subscription"), t("columns.status"), t("columns.joined"), "",
            ].map((h, i) => (
              <TableHead key={i}>{h}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.results.map((owner) => (
            <OwnerRow key={owner.id} owner={owner} />
          ))}
        </TableBody>
      </Table>

      <Pagination count={data.count} pageSize={20} />
    </div>
  );
}

async function OwnerRow({ owner }: { owner: AdminOwner }) {
  const t = await getTranslations("owners");
  const joined = new Date(owner.created_at).toLocaleDateString(undefined, {
    month: "short", day: "numeric", year: "numeric",
  });
  const lastSeen = owner.last_login_at
    ? new Date(owner.last_login_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : null;

  return (
    <TableRow className="group hover:bg-muted/40 transition-colors">
      {/* Owner */}
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Avatar name={owner.full_name || owner.phone} size={34} />
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
              owner.is_active ? "bg-success" : "bg-muted-foreground/50",
            )} />
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-foreground leading-tight truncate">
              {owner.full_name || (
                <span className="text-muted-foreground italic font-normal">{t("noName")}</span>
              )}
            </p>
            {lastSeen && (
              <p className="text-[10px] text-muted-foreground mt-0.5">{t("seen")} {lastSeen}</p>
            )}
          </div>
        </div>
      </TableCell>

      {/* Phone */}
      <TableCell>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-muted text-[11px] font-mono text-muted-foreground">
          {owner.phone}
        </span>
        {!owner.is_verified && (
          <p className="text-[10px] text-warning mt-0.5">{t("unverified")}</p>
        )}
      </TableCell>

      {/* Businesses */}
      <TableCell>
        <div className="flex items-center gap-1.5">
          <Store className="size-3.5 text-muted-foreground/60" />
          <span className="text-[13px] font-semibold text-foreground tabular-nums num">
            {owner.business_count}
          </span>
        </div>
      </TableCell>

      {/* Subscription — Fix #9: clean Badge dot variant, no inline overrides */}
      <TableCell>
        <Badge dot variant={owner.has_active_subscription ? "success" : "default"}>
          {owner.has_active_subscription ? t("activeSub") : t("noPlan")}
        </Badge>
      </TableCell>

      {/* Status — Fix #9: clean Badge dot variant */}
      <TableCell>
        <Badge dot variant={owner.is_active ? "success" : "default"}>
          {owner.is_active ? t("active") : t("inactive")}
        </Badge>
      </TableCell>

      {/* Joined */}
      <TableCell>
        <span className="text-[12px] text-muted-foreground whitespace-nowrap">{joined}</span>
      </TableCell>

      {/* Action */}
      <TableCell className="text-end">
        <ViewOwnerButton ownerId={owner.id} />
      </TableCell>
    </TableRow>
  );
}
