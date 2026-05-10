import { getTranslations } from 'next-intl/server';
import PageTitle from '@/components/ds/PageTitle';

export default async function InventoryPageHeader() {
  const t = await getTranslations('inventory');
  return (
    <PageTitle
      title={t('title')}
      description={t('description')}
    />
  );
}
