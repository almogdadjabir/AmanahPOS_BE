import { fetchAdminDashboard } from "@/services/admin";
import { getLocale, getTranslations } from "next-intl/server";
import OwnersDrawerShell from "../owners/_components/OwnersDrawerShell";

import AdminDashboardError from "./_admin/AdminDashboardError";
import AdminKpiCards from "./_admin/AdminKpiCards";
import AdminOwnerGrowthCard from "./_admin/AdminOwnerGrowthCard";
import AdminQuickActions from "./_admin/AdminQuickActions";
import AdminRecentOwners from "./_admin/AdminRecentOwners";
import AdminRecentTransactions from "./_admin/AdminRecentTransactions";
import AdminSubscriptionPlans from "./_admin/AdminSubscriptionPlans";

export default async function AdminOverview() {
  try {
    const [{ plans, stats }, t, locale] = await Promise.all([
      fetchAdminDashboard(),
      getTranslations("dashboard"),
      getLocale(),
    ]);

    const now = new Date();

    const dateStr = now.toLocaleDateString(locale === "ar" ? "ar" : "en", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const hour = now.getHours();
    const greeting =
      hour < 12
        ? t("greetingMorning")
        : hour < 17
          ? t("greetingAfternoon")
          : t("greetingEvening");

    return (
      <OwnersDrawerShell>
        <div className="space-y-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-black text-foreground tracking-tight leading-tight">
                {greeting} 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {t("platformOverview")} &mdash; {dateStr}
              </p>
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-2 shrink-0 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                {t("live")}
              </span>
            </div>
          </div>

          <AdminKpiCards stats={stats} />

          {/* ── Main content row: chart + recent owners ────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 lg:h-[360px]">
              <AdminOwnerGrowthCard stats={stats} />
            </div>
            <div className="lg:h-[360px]">
              <AdminRecentOwners stats={stats} />
            </div>
          </div>

          {/* ── Secondary row: actions + plans ────────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2">
              <AdminQuickActions />
            </div>
            <div>
              <AdminSubscriptionPlans plans={plans} />
            </div>
          </div>

          {/* ── Recent transactions (full width) ──────────────────────────── */}
          <AdminRecentTransactions stats={stats} />
        </div>
      </OwnersDrawerShell>
    );
  } catch {
    return <AdminDashboardError />;
  }
}
