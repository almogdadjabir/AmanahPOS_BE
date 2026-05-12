import { getTranslations } from 'next-intl/server';
import { fetchAdminNotifSettings } from '@/services/notifications';
import SettingsPanel from './_components/SettingsPanel';

export default async function NotifSettingsPage() {
  const t        = await getTranslations('notifications');
  const settings = await fetchAdminNotifSettings();
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-6">{t('settingsDescription')}</p>
      <SettingsPanel initial={settings} />
    </div>
  );
}
