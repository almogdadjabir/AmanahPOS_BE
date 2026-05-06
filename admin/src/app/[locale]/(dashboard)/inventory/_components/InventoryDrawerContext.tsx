'use client';

import { createContext, useContext } from 'react';
import type { StockLevel } from '@/types/api';

interface InventoryDrawerCtx {
  openAdjust:  (item: StockLevel) => void;
  openHistory: (item: StockLevel) => void;
}

export const InventoryDrawerContext = createContext<InventoryDrawerCtx | null>(null);

export function useInventoryDrawer(): InventoryDrawerCtx {
  const ctx = useContext(InventoryDrawerContext);
  if (!ctx) throw new Error('useInventoryDrawer must be inside InventoryDrawerShell');
  return ctx;
}
