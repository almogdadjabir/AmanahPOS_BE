'use client';

import { UserPlus } from 'lucide-react';
import PageTitle from '@/components/ds/PageTitle';
import { Button } from '@/components/ui/button';
import { useStaffDrawer } from './StaffDrawerContext';

export default function StaffPageHeader() {
  const { openAdd } = useStaffDrawer();

  return (
    <PageTitle
      title="Staff"
      description="Manage your managers and cashiers."
      action={
        <Button size="sm" className="gap-1.5" onClick={openAdd}>
          <UserPlus size={14} />
          Add Staff
        </Button>
      }
    />
  );
}
