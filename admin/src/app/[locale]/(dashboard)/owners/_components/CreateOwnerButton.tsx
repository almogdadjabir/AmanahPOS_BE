'use client';

import { Plus } from 'lucide-react';
import { useOwnerDrawer } from './OwnerDrawerContext';
import { Button } from '@/components/ui/button';

export default function CreateOwnerButton() {
  const { openCreate } = useOwnerDrawer();
  return (
    <Button variant="default" size="sm" type="button" onClick={openCreate}>
      <Plus className="size-3.5" /> Create Owner
    </Button>
  );
}
