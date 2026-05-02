import { fetchAdminDashboard } from "@/services/admin";
import OwnersDrawerShell from "../owners/_components/OwnersDrawerShell";

import AdminDashboardError from "./_admin/AdminDashboardError";
import AdminKpiCards from "./_admin/AdminKpiCards";
import AdminOwnerGrowthCard from "./_admin/AdminOwnerGrowthCard";
import AdminQuickActions from "./_admin/AdminQuickActions";
import AdminRecentOwners from "./_admin/AdminRecentOwners";
import AdminSubscriptionPlans from "./_admin/AdminSubscriptionPlans";
import AdminSystemHealth from "./_admin/AdminSystemHealth";

export default async function AdminOverview() {
  try {
    const { health, plans, stats } = await fetchAdminDashboard();

    return (
      <OwnersDrawerShell>
        <div className="space-y-5">
          <AdminSystemHealth health={health} />

          <AdminKpiCards stats={stats} />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <AdminOwnerGrowthCard stats={stats} />
            <AdminRecentOwners stats={stats} />
          </div>

          <AdminQuickActions />

          <AdminSubscriptionPlans plans={plans} />
        </div>
      </OwnersDrawerShell>
    );
  } catch {
    return <AdminDashboardError />;
  }
}
