'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import type { Shop } from '@/types/api';

interface Props {
  shops: Shop[];
}

export function ShopSwitcherBar({ shops }: Props) {
  const router      = useRouter();
  const params      = useSearchParams();
  const pathname    = usePathname();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeShops   = shops.filter(s => s.is_active);
  const urlShopId     = params.get('shop_id') ?? null;

  // Optimistic selection: show the clicked shop immediately, sync back when URL settles.
  const [optimistic, setOptimistic] = useState<string | null | undefined>(undefined);
  useEffect(() => { setOptimistic(undefined); }, [urlShopId]);

  if (activeShops.length < 2) return null;

  const current = optimistic !== undefined ? optimistic : urlShopId;

  function select(shopId: string | null) {
    // Show selection immediately — no waiting for the server round-trip.
    setOptimistic(shopId);

    // Debounce the actual navigation: if the user clicks again within 400ms,
    // cancel the pending navigation and restart the timer. This prevents
    // rapid switching from firing multiple concurrent server renders.
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const p = new URLSearchParams(params.toString());
      if (shopId) p.set('shop_id', shopId);
      else        p.delete('shop_id');
      router.push(`${pathname}?${p.toString()}`);
    }, 400);
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide">
      <button
        type="button"
        onClick={() => select(null)}
        className={[
          'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold',
          'transition-all duration-150 whitespace-nowrap',
          current === null
            ? 'bg-primary text-white shadow-sm'
            : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
        ].join(' ')}
      >
        All Shops
      </button>

      {activeShops.map(shop => (
        <button
          key={shop.id}
          type="button"
          onClick={() => select(shop.id)}
          className={[
            'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-semibold',
            'transition-all duration-150 whitespace-nowrap',
            current === shop.id
              ? 'bg-primary text-white shadow-sm'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
          ].join(' ')}
        >
          {shop.name}
        </button>
      ))}
    </div>
  );
}
