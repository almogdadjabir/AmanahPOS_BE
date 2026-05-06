'use client';

import { SlidersHorizontal, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useInventoryDrawer } from './InventoryDrawerContext';
import type { StockLevel } from '@/types/api';

export default function InventoryRowActions({ item }: { item: StockLevel }) {
  const { openAdjust, openHistory } = useInventoryDrawer();

  return (
    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={() => openAdjust(item)}
      >
        <SlidersHorizontal size={12} />
        Adjust
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={() => openHistory(item)}
      >
        <History size={12} />
        History
      </Button>
    </div>
  );
}
