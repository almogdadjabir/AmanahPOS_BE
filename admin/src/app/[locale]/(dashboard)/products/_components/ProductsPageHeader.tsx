'use client';

import { Package, FolderPlus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useProductDrawer } from './ProductDrawerContext';

export default function ProductsPageHeader() {
  const { openCreateProduct, openCreateCategory } = useProductDrawer();

  return (
    <div className="flex items-start justify-between mb-6 gap-4">
      <div className="flex items-center gap-3">
        <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0 [&_svg]:size-5">
          <Package />
        </span>
        <div>
          <h1 className="text-[22px] font-black text-foreground tracking-tight leading-tight">
            Products
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Manage your product catalogue and categories.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0 mt-0.5">
        <Button
          variant="secondary"
          size="sm"
          onClick={openCreateCategory}
          className="gap-1.5 hidden sm:flex"
        >
          <FolderPlus size={14} />
          New Category
        </Button>
        <Button size="sm" onClick={() => openCreateProduct()} className="gap-1.5">
          <Plus size={14} />
          Add Product
        </Button>
      </div>
    </div>
  );
}
