'use client';

import { UserPlus } from 'lucide-react';
import { useTranslations } from 'next-intl';
import PageTitle from '@/components/ds/PageTitle';
import { Button } from '@/components/ui/button';
import { useCustomerDrawer } from './CustomerDrawerContext';

export default function CustomerPageHeader() {
  const t = useTranslations('customers');
  const { openAdd } = useCustomerDrawer();

  return (
    <PageTitle
      title={t('title')}
      description={t('description')}
      action={
        <Button size="sm" className="gap-1.5" onClick={openAdd}>
          <UserPlus size={14} />
          {t('addCustomer')}
        </Button>
      }
    />
  );
}
