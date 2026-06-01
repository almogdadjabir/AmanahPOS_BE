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

    return (
      <OwnersDrawerShell>
        {/* Fix #11: 16px gaps everywhere (gap-4 / space-y-4) */}
        <div className="space-y-4">
          {/* Fix #15: no emoji — "Platform overview" + metadata subline
              Fix #12: Live indicator removed from here (now lives in the topbar) */}
          <div>
            <h1 className="text-[21px] font-semibold text-foreground tracking-[-.025em] leading-tight">
              {t("platformOverview")}
            </h1>
            <p className="text-[13px] text-muted-foreground mt-1">
              {dateStr}
            </p>
          </div>

          <AdminKpiCards stats={stats} />

          {/* Fix #13: fixed row height anchors both cards to equal height;
              min-h-0 on cells lets overflow-y-auto work inside Recent Owners */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:h-[360px]">
            <div className="lg:col-span-2 min-h-0">
              <AdminOwnerGrowthCard stats={stats} />
            </div>
            <div className="min-h-0">
              <AdminRecentOwners stats={stats} />
            </div>
          </div>

          {/* Fix #11: gap-4 */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <AdminQuickActions />
            </div>
            <div>
              <AdminSubscriptionPlans plans={plans} />
            </div>
          </div>

          <AdminRecentTransactions stats={stats} />
        </div>
      </OwnersDrawerShell>
    );
  } catch {
    return <AdminDashboardError />;
  }
}
