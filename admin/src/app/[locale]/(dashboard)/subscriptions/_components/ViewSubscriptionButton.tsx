'use client';

import { ArrowRight } from 'lucide-react';
import { useSubscriptionDrawer } from './SubscriptionDrawerContext';

export default function ViewSubscriptionButton({ subscriptionId }: { subscriptionId: string }) {
  const { openView } = useSubscriptionDrawer();
  return (
    <button
      type="button"
      onClick={() => openView(subscriptionId)}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-warning hover:text-warning/80 opacity-0 group-hover:opacity-100 transition-all duration-150 bg-warning/10 hover:bg-warning/15 px-2.5 py-1 rounded-md"
    >
      View <ArrowRight className="size-3" />
    </button>
  );
}
