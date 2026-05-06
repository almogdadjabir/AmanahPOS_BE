'use client';

import { createContext, useContext } from 'react';
import type { Category, Product } from '@/types/api';

interface ProductDrawerCtx {
  openCreateProduct:  (defaultCategoryId?: string) => void;
  openEditProduct:    (product: Product)            => void;
  openDeleteProduct:  (product: Product)            => void;
  openCreateCategory: ()                            => void;
  openEditCategory:   (category: Category)          => void;
  openDeleteCategory: (category: Category)          => void;
}

export const ProductDrawerContext = createContext<ProductDrawerCtx | null>(null);

export function useProductDrawer(): ProductDrawerCtx {
  const ctx = useContext(ProductDrawerContext);
  if (!ctx) throw new Error('useProductDrawer must be inside ProductsDrawerShell');
  return ctx;
}
