'use client';

import { createContext, useContext } from 'react';

interface BusinessDrawerContextValue {
  openView:   (id: string) => void;
  openCreate: () => void;
}

export const BusinessDrawerContext = createContext<BusinessDrawerContextValue>({
  openView:   () => {},
  openCreate: () => {},
});

export function useBusinessDrawer() {
  return useContext(BusinessDrawerContext);
}
