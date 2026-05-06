'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useProductDrawer } from './ProductDrawerContext';
import { toggleProductActiveAction } from '@/actions/products';
import type { Product } from '@/types/api';

export default function ProductRowActions({ product }: { product: Product }) {
  const { openEditProduct, openDeleteProduct } = useProductDrawer();
  const router = useRouter();
  const [isToggling, startToggle] = useTransition();

  function handleToggle() {
    startToggle(async () => {
      await toggleProductActiveAction(product.id, !product.is_active);
      router.refresh();
    });
  }

  return (
    <div className="flex items-center justify-end gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
      <ActionBtn
        onClick={() => openEditProduct(product)}
        label="Edit"
        icon={<Pencil size={13} />}
        className="hover:bg-muted hover:text-foreground"
      />
      <ActionBtn
        onClick={handleToggle}
        disabled={isToggling}
        label={product.is_active ? 'Deactivate' : 'Activate'}
        icon={product.is_active ? <EyeOff size={13} /> : <Eye size={13} />}
        className={product.is_active
          ? 'hover:bg-warning/10 hover:text-warning'
          : 'hover:bg-success/10 hover:text-success'}
      />
      <ActionBtn
        onClick={() => openDeleteProduct(product)}
        label="Delete"
        icon={<Trash2 size={13} />}
        className="hover:bg-destructive/10 hover:text-destructive"
      />
    </div>
  );
}

function ActionBtn({
  onClick, label, icon, className, disabled,
}: {
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      title={label}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'w-7 h-7 flex items-center justify-center rounded-md text-muted-foreground transition-colors disabled:opacity-40',
        className,
      )}
    >
      {icon}
    </button>
  );
}
