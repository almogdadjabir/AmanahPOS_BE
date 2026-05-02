'use client';

import { useOwnerDrawer } from './OwnerDrawerContext';
import Button from '@/components/ui/Button';

export default function CreateOwnerButton() {
  const { openCreate } = useOwnerDrawer();
  return (
    <Button variant="primary" size="sm" type="button" onClick={openCreate}>
      <PlusIcon /> Create Owner
    </Button>
  );
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19"/>
      <line x1="5" y1="12" x2="19" y2="12"/>
    </svg>
  );
}
