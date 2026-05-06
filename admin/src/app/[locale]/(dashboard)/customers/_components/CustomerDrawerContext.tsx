'use client';

import { createContext, useContext } from 'react';
import type { Customer } from '@/types/api';

interface CustomerDrawerCtx {
  openAdd:        ()                      => void;
  openEdit:       (customer: Customer)    => void;
  openDeactivate: (customer: Customer)    => void;
}

export const CustomerDrawerContext = createContext<CustomerDrawerCtx | null>(null);

export function useCustomerDrawer(): CustomerDrawerCtx {
  const ctx = useContext(CustomerDrawerContext);
  if (!ctx) throw new Error('useCustomerDrawer must be inside CustomerDrawerShell');
  return ctx;
}
