'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { NotificationsContext } from './NotificationsContext';
import Drawer from '@/components/ds/Drawer';
import SendDrawer from './SendDrawer';
import TemplatesDrawer from './TemplatesDrawer';
import SettingsDrawer from './SettingsDrawer';

export default function NotificationsDrawerShell({ children }: { children: React.ReactNode }) {
  const t = useTranslations('notifications');
  const [sendOpen,      setSendOpen]      = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [settingsOpen,  setSettingsOpen]  = useState(false);

  return (
    <NotificationsContext.Provider value={{
      openSend:      () => setSendOpen(true),
      openTemplates: () => setTemplatesOpen(true),
      openSettings:  () => setSettingsOpen(true),
    }}>
      {children}

      <Drawer open={sendOpen} onClose={() => setSendOpen(false)}
        title={t('sendNotification')} subtitle={t('sendDescription')}
      >
        <SendDrawer onClose={() => setSendOpen(false)} />
      </Drawer>

      <Drawer open={templatesOpen} onClose={() => setTemplatesOpen(false)}
        title={t('templatesTitle')} subtitle={t('templatesDescription')}
      >
        <TemplatesDrawer />
      </Drawer>

      <Drawer open={settingsOpen} onClose={() => setSettingsOpen(false)}
        title={t('settingsTitle')} subtitle={t('settingsDescription')}
      >
        <SettingsDrawer />
      </Drawer>
    </NotificationsContext.Provider>
  );
}
