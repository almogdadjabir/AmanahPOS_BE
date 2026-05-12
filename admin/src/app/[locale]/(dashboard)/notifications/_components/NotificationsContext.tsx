'use client';

import { createContext, useContext } from 'react';

interface Value {
  openSend:      () => void;
  openTemplates: () => void;
  openSettings:  () => void;
}

export const NotificationsContext = createContext<Value>({
  openSend: () => {}, openTemplates: () => {}, openSettings: () => {},
});

export function useNotifications() {
  return useContext(NotificationsContext);
}
