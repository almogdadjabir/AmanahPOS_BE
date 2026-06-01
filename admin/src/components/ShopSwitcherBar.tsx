'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import type { Shop } from '@/types/api';

interface Props {
  shops: Shop[];
}

export function ShopSwitcherBar({ shops }: Props) {
  const router      = useRouter();
  const params      = useSearchParams();
  const pathname    = usePathname();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeShops = shops.filter(s => s.is_active);
  const urlShopId   = params.get('shop_id') ?? null;

  // Optimistic selection: show the clicked shop immediately, sync back when URL settles.
  const [optimistic, setOptimistic] = useState<string | null | undefined>(undefined);
  useEffect(() => { setOptimistic(undefined); }, [urlShopId]);

  if (activeShops.length < 2) return null;

  const current = optimistic !== undefined ? optimistic : urlShopId;

  function select(shopId: string | null) {
    setOptimistic(shopId);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const p = new URLSearchParams(params.toString());
      if (shopId) p.set('shop_id', shopId);
      else        p.delete('shop_id');
      router.push(`${pathname}?${p.toString()}`);
    }, 400);
  }

  // S5: active = solid teal fill, one edge (shadow only, no border)
  //     inactive = card with border, one edge each — no doubled edges
  const activeCls  = 'bg-primary text-primary-foreground shadow-[0_1px_2px_rgba(15,118,110,.32),0_2px_8px_-2px_rgba(15,118,110,.30)]';
  const inactiveCls = 'bg-card border border-input text-muted-foreground shadow-xs hover:bg-muted hover:text-foreground';

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-0.5">
      <button
        type="button"
        onClick={() => select(null)}
        className={cn(
          'flex-shrink-0 px-3 py-1.5 rounded-full text-[12.5px] font-semibold',
          'transition-all duration-150 whitespace-nowrap',
          current === null ? activeCls : inactiveCls,
        )}
      >
        All Shops
      </button>

      {activeShops.map(shop => (
        <button
          key={shop.id}
          type="button"
          onClick={() => select(shop.id)}
          className={cn(
            'flex-shrink-0 px-3 py-1.5 rounded-full text-[12.5px] font-semibold',
            'transition-all duration-150 whitespace-nowrap',
            current === shop.id ? activeCls : inactiveCls,
          )}
        >
          {shop.name}
        </button>
      ))}
    </div>
  );
}
