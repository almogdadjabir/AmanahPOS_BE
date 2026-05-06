'use client';

import { Pencil, UserX, UserCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCustomerDrawer } from './CustomerDrawerContext';
import type { Customer } from '@/types/api';

export default function CustomerRowActions({ customer }: { customer: Customer }) {
  const { openEdit, openDeactivate } = useCustomerDrawer();

  return (
    <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 text-xs"
        onClick={() => openEdit(customer)}
      >
        <Pencil size={12} />
        Edit
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={`h-7 gap-1.5 text-xs ${customer.is_active ? 'text-destructive hover:text-destructive hover:bg-destructive/5' : 'text-green-600 hover:text-green-600 hover:bg-green-50'}`}
        onClick={() => openDeactivate(customer)}
      >
        {customer.is_active ? <UserX size={12} /> : <UserCheck size={12} />}
        {customer.is_active ? 'Deactivate' : 'Activate'}
      </Button>
    </div>
  );
}
