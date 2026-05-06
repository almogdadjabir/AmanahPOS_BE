'use client';

import { createContext, useContext } from 'react';
import type { StaffUser } from '@/types/api';

interface StaffDrawerCtx {
  openAdd:        ()                   => void;
  openEdit:       (user: StaffUser)    => void;
  openDeactivate: (user: StaffUser)    => void;
}

export const StaffDrawerContext = createContext<StaffDrawerCtx | null>(null);

export function useStaffDrawer(): StaffDrawerCtx {
  const ctx = useContext(StaffDrawerContext);
  if (!ctx) throw new Error('useStaffDrawer must be inside StaffDrawerShell');
  return ctx;
}
