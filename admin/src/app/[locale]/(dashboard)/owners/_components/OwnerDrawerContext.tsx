'use client';

import { createContext, useContext } from 'react';

interface OwnerDrawerContextValue {
  openView: (id: string) => void;
  openCreate: () => void;
}

export const OwnerDrawerContext = createContext<OwnerDrawerContextValue>({
  openView:   () => {},
  openCreate: () => {},
});

export function useOwnerDrawer() {
  return useContext(OwnerDrawerContext);
}
