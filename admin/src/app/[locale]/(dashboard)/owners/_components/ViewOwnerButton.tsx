'use client';

import { useOwnerDrawer } from './OwnerDrawerContext';

export default function ViewOwnerButton({ ownerId }: { ownerId: string }) {
  const { openView } = useOwnerDrawer();
  return (
    <button
      type="button"
      onClick={() => openView(ownerId)}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
    >
      View <ArrowIcon />
    </button>
  );
}

function ArrowIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M12 5l7 7-7 7"/>
    </svg>
  );
}
