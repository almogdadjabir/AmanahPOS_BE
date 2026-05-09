import { fetchHealth } from '@/services/admin';
import { Activity }            from 'lucide-react';

import SystemErrorState    from './_components/SystemErrorState';
import SystemHealthCards   from './_components/SystemHealthCards';
import SystemHealthPayload from './_components/SystemHealthPayload';
import SystemStatusHero    from './_components/SystemStatusHero';

export default async function SystemPage() {
  try {
    const health = await fetchHealth();

    return (
      <div>
        {/* Page header */}
        <div className="flex items-start justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-info/10 text-info flex items-center justify-center shrink-0 [&_svg]:size-5">
              <Activity />
            </span>
            <div>
              <h1 className="text-[22px] font-black text-foreground tracking-tight leading-tight">
                System
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Platform health, infrastructure status, and diagnostics.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <SystemStatusHero    health={health} />
          <SystemHealthCards   health={health} />
          <SystemHealthPayload health={health} />
        </div>
      </div>
    );
  } catch {
    return <SystemErrorState />;
  }
}
