'use client';

import { ArrowRight } from 'lucide-react';
import { usePlanDrawer } from './PlanDrawerContext';

export default function ViewPlanButton({ planId }: { planId: string }) {
  const { openView } = usePlanDrawer();
  return (
    <button
      type="button"
      onClick={() => openView(planId)}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-success hover:text-success/80 opacity-0 group-hover:opacity-100 transition-all duration-150 bg-success/10 hover:bg-success/15 px-2.5 py-1 rounded-md"
    >
      View <ArrowRight className="size-3" />
    </button>
  );
}
