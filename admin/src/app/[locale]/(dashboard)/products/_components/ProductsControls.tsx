'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useProductDrawer } from './ProductDrawerContext';
import SearchInput from '@/components/ds/SearchInput';
import { cn } from '@/lib/utils';
import { FolderPlus, Pencil, Trash2 } from 'lucide-react';
import type { Category } from '@/types/api';

const STATUS_TABS = [
  { label: 'All',      value: 'all'      },
  { label: 'Active',   value: 'active'   },
  { label: 'Inactive', value: 'inactive' },
] as const;

interface Props {
  categories: Category[];
}

export default function ProductsControls({ categories }: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const { openCreateCategory, openEditCategory, openDeleteCategory } = useProductDrawer();

  const categoryId = searchParams.get('category') ?? '';
  const status     = (searchParams.get('status') ?? 'all') as 'all' | 'active' | 'inactive';

  const activeCategory = categories.find(c => c.id === categoryId) ?? null;

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (!value || value === 'all') {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-3 mb-5">
      {/* Row 1: Search + status filter */}
      <div className="flex items-center gap-3 flex-wrap p-3 bg-card rounded-xl border border-border shadow-card">
        <SearchInput
          placeholder="Search by name, SKU, or barcode…"
          className="w-full sm:w-72"
        />
        <div className="h-4 w-px bg-border hidden sm:block" />
        <TabGroup
          label="Status"
          tabs={STATUS_TABS}
          value={status}
          onChange={v => setParam('status', v)}
        />
      </div>

      {/* Row 2: Category tabs */}
      <div className="flex items-center gap-1 flex-nowrap overflow-x-auto scrollbar-none pb-0.5 bg-card rounded-xl border border-border px-3 py-2 shadow-card">
        {/* All tab */}
        <button
          onClick={() => setParam('category', '')}
          className={cn(
            'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0',
            !categoryId
              ? 'bg-primary text-primary-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground hover:bg-muted',
          )}
        >
          All products
        </button>

        {categories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setParam('category', cat.id)}
            className={cn(
              'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all shrink-0',
              categoryId === cat.id
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted',
            )}
          >
            {cat.name}
          </button>
        ))}

        {/* Spacer */}
        <div className="flex-1 min-w-2" />

        {/* Category actions */}
        <div className="flex items-center gap-1 shrink-0 pl-2 border-l border-border/60">
          {activeCategory && (
            <>
              <button
                onClick={() => openEditCategory(activeCategory)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Pencil size={12} />
                <span className="hidden sm:inline">Edit</span>
              </button>
              <button
                onClick={() => openDeleteCategory(activeCategory)}
                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-colors"
              >
                <Trash2 size={12} />
                <span className="hidden sm:inline">Delete</span>
              </button>
            </>
          )}
          <button
            onClick={openCreateCategory}
            className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors"
          >
            <FolderPlus size={12} />
            <span className="hidden sm:inline">New</span>
          </button>
        </div>
      </div>
    </div>
  );
}

function TabGroup<T extends string>({
  label,
  tabs,
  value,
  onChange,
}: {
  label:    string;
  tabs:     readonly { label: string; value: T }[];
  value:    T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em] shrink-0">
        {label}
      </span>
      <div className="flex items-center gap-0.5 bg-muted rounded-lg p-0.5">
        {tabs.map(t => (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            className={cn(
              'px-3 py-1 rounded-md text-xs font-semibold transition-all duration-150',
              t.value === value
                ? 'bg-card text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
}
