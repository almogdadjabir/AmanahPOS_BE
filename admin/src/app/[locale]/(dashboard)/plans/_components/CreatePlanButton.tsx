'use client';

import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlanDrawer } from './PlanDrawerContext';

export default function CreatePlanButton() {
  const { openCreate } = usePlanDrawer();
  return (
    <Button size="sm" onClick={openCreate} className="gap-1.5">
      <Plus className="size-3.5" />
      New Plan
    </Button>
  );
}
