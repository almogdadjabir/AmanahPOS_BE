'use client';

import { UserPlus } from 'lucide-react';
import PageTitle from '@/components/ds/PageTitle';
import { Button } from '@/components/ui/button';
import { useCustomerDrawer } from './CustomerDrawerContext';

export default function CustomerPageHeader() {
  const { openAdd } = useCustomerDrawer();

  return (
    <PageTitle
      title="Customers"
      description="View and manage your customer base."
      action={
        <Button size="sm" className="gap-1.5" onClick={openAdd}>
          <UserPlus size={14} />
          Add Customer
        </Button>
      }
    />
  );
}
