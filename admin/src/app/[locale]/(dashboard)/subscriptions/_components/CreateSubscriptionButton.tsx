'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSubscriptionDrawer } from './SubscriptionDrawerContext';

export default function CreateSubscriptionButton() {
  const { openCreate } = useSubscriptionDrawer();
  return (
    <Button size="sm" onClick={openCreate} className="gap-1.5">
      <Plus className="size-3.5" />
      New Subscription
    </Button>
  );
}
