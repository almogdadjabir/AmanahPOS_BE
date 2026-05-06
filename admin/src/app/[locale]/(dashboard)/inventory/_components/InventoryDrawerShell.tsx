'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { InventoryDrawerContext } from './InventoryDrawerContext';
import StockAdjustDrawer from './StockAdjustDrawer';
import StockHistoryDrawer from './StockHistoryDrawer';
import type { StockLevel } from '@/types/api';

export default function InventoryDrawerShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [adjustItem,  setAdjustItem]  = useState<StockLevel | null>(null);
  const [historyItem, setHistoryItem] = useState<StockLevel | null>(null);

  function openAdjust(item: StockLevel)  { setAdjustItem(item); }
  function openHistory(item: StockLevel) { setHistoryItem(item); }

  function closeAdjust()  { setAdjustItem(null); }
  function closeHistory() { setHistoryItem(null); }

  function handleSuccess() {
    setAdjustItem(null);
    router.refresh();
  }

  return (
    <InventoryDrawerContext.Provider value={{ openAdjust, openHistory }}>
      {children}

      <StockAdjustDrawer
        item={adjustItem}
        onClose={closeAdjust}
        onSuccess={handleSuccess}
      />

      <StockHistoryDrawer
        item={historyItem}
        onClose={closeHistory}
      />
    </InventoryDrawerContext.Provider>
  );
}
