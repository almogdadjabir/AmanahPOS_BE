import { getTranslations } from 'next-intl/server';
import LogsTable from './_components/LogsTable';

export default async function LogsPage() {
  const t = await getTranslations('notifications');
  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">{t('logsDescription')}</p>
      <LogsTable />
    </div>
  );
}
