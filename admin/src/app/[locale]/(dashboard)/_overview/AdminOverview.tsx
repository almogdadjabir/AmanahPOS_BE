import { fetchAdminDashboard } from "@/services/admin";
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
    const { health, plans, stats } = await fetchAdminDashboard();

    const now = new Date();
    const dateStr = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
    const hour = now.getHours();
    const greeting =
      hour < 12
        ? "Good morning"
        : hour < 17
          ? "Good afternoon"
          : "Good evening";

    return (
      <OwnersDrawerShell>
        <div className="space-y-5">
          {/* ── Page header ──────────────────────────────────────────────── */}
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-[22px] font-black text-foreground tracking-tight leading-tight">
                {greeting} 👋
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Platform overview &mdash; {dateStr}
              </p>
            </div>

            {/* Live indicator */}
            <div className="flex items-center gap-2 shrink-0 mt-1">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-50" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
              </span>
              <span className="text-[11px] font-semibold text-muted-foreground">
                Live
              </span>
            </div>
          </div>

          {/* ── KPI cards ─────────────────────────────────────────────────── */}
          <AdminKpiCards stats={stats} />

          {/* ── Main content row: chart + recent owners ────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-start">
            <div className="lg:col-span-2">
              <AdminOwnerGrowthCard stats={stats} />
            </div>
            <AdminRecentOwners stats={stats} />
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
