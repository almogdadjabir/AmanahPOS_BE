'use client';

import { createContext, useContext } from 'react';

interface PlanDrawerContextValue {
  openView:   (id: string) => void;
  openCreate: () => void;
}

export const PlanDrawerContext = createContext<PlanDrawerContextValue>({
  openView:   () => {},
  openCreate: () => {},
});

export function usePlanDrawer() {
  return useContext(PlanDrawerContext);
}
