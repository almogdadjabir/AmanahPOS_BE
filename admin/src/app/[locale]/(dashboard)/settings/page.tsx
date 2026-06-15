import { getTranslations } from 'next-intl/server';
import { fetchBusiness } from '@/services/owner';
import PageTitle from '@/components/ds/PageTitle';
import EmptyState from '@/components/ds/EmptyState';
import { Settings as SettingsIcon } from 'lucide-react';
import TaxSettingsForm from './_components/TaxSettingsForm';
import BusinessProfileForm from './_components/BusinessProfileForm';

export const dynamic = 'force-dynamic';

export default async function SettingsPage() {
  const t = await getTranslations('settings');
  const bizRes = await fetchBusiness();
  const business = bizRes?.data?.[0];

  return (
    <div className="space-y-4">
      <PageTitle title={t('title')} description={t('description')} />

      {business ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <BusinessProfileForm business={business} />
          <TaxSettingsForm business={business} />
        </div>
      ) : (
        <EmptyState
          icon={<SettingsIcon />}
          title={t('noBusiness.title')}
          description={t('noBusiness.description')}
        />
      )}
    </div>
  );
}
