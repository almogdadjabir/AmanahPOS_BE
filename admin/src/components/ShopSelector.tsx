'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import type { Shop } from '@/types/api';

interface Props {
  shops: Shop[];
  selectedShopId?: string;
}

export default function ShopSelector({ shops, selectedShopId }: Props) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  // Read active shop from the URL immediately so the pill updates on click
  // before the server responds, giving instant visual feedback.
  const active = searchParams.get('shop') ?? selectedShopId ?? '';

  const select = useCallback((shopId: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (shopId) params.set('shop', shopId);
    else        params.delete('shop');
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  }, [router, pathname, searchParams]);

  const all = [{ id: '', name: 'All shops' }, ...shops.filter(s => s.is_active)];

  return (
    <div className={`flex items-center gap-1.5 flex-wrap transition-opacity ${isPending ? 'opacity-60' : ''}`}>
      <span className="text-[11px] font-semibold text-text-hint uppercase tracking-[.12em] mr-1">
        Shop
      </span>
      {all.map(shop => (
        <button
          key={shop.id}
          type="button"
          onClick={() => !isPending && select(shop.id)}
          className={[
            'h-7 px-3 rounded-full text-[11px] font-semibold border transition-all',
            active === shop.id
              ? 'bg-primary text-white border-primary shadow-sm'
              : 'bg-white text-text-secondary border-border-soft hover:border-primary/40 hover:text-primary',
            isPending ? 'cursor-wait' : '',
          ].join(' ')}
        >
          {shop.name}
        </button>
      ))}
      {isPending && (
        <span className="w-3.5 h-3.5 rounded-full border-2 border-primary border-t-transparent animate-spin ml-1 shrink-0" />
      )}
    </div>
  );
}
