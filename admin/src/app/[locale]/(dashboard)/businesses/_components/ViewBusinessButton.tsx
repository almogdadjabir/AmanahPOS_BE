'use client';

import { ArrowRight } from 'lucide-react';
import { useBusinessDrawer } from './BusinessDrawerContext';

export default function ViewBusinessButton({ businessId }: { businessId: string }) {
  const { openView } = useBusinessDrawer();
  return (
    <button
      type="button"
      onClick={() => openView(businessId)}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-info hover:text-info/80 opacity-0 group-hover:opacity-100 transition-all duration-150 bg-info/10 hover:bg-info/15 px-2.5 py-1 rounded-md"
    >
      View <ArrowRight className="size-3" />
    </button>
  );
}
