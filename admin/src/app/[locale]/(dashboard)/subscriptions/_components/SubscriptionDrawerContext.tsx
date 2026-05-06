'use client';

import { createContext, useContext } from 'react';

interface SubscriptionDrawerContextValue {
  openView:   (id: string) => void;
  openCreate: () => void;
}

export const SubscriptionDrawerContext = createContext<SubscriptionDrawerContextValue>({
  openView:   () => {},
  openCreate: () => {},
});

export function useSubscriptionDrawer() {
  return useContext(SubscriptionDrawerContext);
}
