'use client';

import { Plus } from 'lucide-react';
import { useBusinessDrawer } from './BusinessDrawerContext';
import { Button } from '@/components/ui/button';

export default function CreateBusinessButton() {
  const { openCreate } = useBusinessDrawer();
  return (
    <Button variant="default" size="sm" type="button" onClick={openCreate}>
      <Plus className="size-3.5" /> Create Business
    </Button>
  );
}
