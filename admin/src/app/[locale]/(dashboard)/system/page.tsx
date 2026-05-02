import { fetchAdminDashboard } from "@/services/admin";
import PageTitle from "@/components/ds/PageTitle";

import SystemErrorState from "./_components/SystemErrorState";
import SystemHealthCards from "./_components/SystemHealthCards";
import SystemHealthPayload from "./_components/SystemHealthPayload";
import SystemStatusHero from "./_components/SystemStatusHero";

export default async function SystemPage() {
  try {
    const { health } = await fetchAdminDashboard();

    return (
      <div>
        <PageTitle
          title="System"
          description="Platform health, infrastructure status, and diagnostics."
        />

        <div className="space-y-4">
          <SystemStatusHero health={health} />
          <SystemHealthCards health={health} />
          <SystemHealthPayload health={health} />
        </div>
      </div>
    );
  } catch {
    return <SystemErrorState />;
  }
}
