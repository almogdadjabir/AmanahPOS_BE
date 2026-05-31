'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { buttonVariants } from '@/components/ui/button';

interface PaginationProps {
  count:      number;
  pageSize?:  number;
  className?: string;
}

export default function Pagination({ count, pageSize = 20, className = '' }: PaginationProps) {
  const t            = useTranslations('common');
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const currentPage  = Number(searchParams.get('page') ?? 1);
  const totalPages   = Math.max(1, Math.ceil(count / pageSize));

  if (totalPages <= 1) return null;

  function go(page: number) {
    const params = new URLSearchParams(searchParams.toString());
    if (page === 1) {
      params.delete('page');
    } else {
      params.set('page', String(page));
    }
    router.push(`${pathname}?${params.toString()}`);
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end   = Math.min(currentPage * pageSize, count);

  return (
    <div className={cn('flex items-center justify-between px-4 py-3 border-t border-border', className)}>
      <p className="text-xs text-muted-foreground">
        {t('showing')}{' '}
        <span className="font-semibold text-foreground">{start}–{end}</span>
        {' '}{t('of')}{' '}
        <span className="font-semibold text-foreground">{count}</span>
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => go(currentPage - 1)}
          disabled={currentPage <= 1}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'icon-sm' }),
            'disabled:opacity-30 disabled:pointer-events-none',
          )}
        >
          <ChevronLeft size={13} />
        </button>

        {computePages(currentPage, totalPages).map((page, i) => {
          if (page === -1) return (
            <span key={`dots-${i}`} className="h-7 w-7 flex items-center justify-center text-[11px] text-muted-foreground">
              …
            </span>
          );
          return (
            <button
              key={page}
              onClick={() => go(page)}
              className={cn(
                'h-7 min-w-[28px] px-1.5 flex items-center justify-center rounded-md text-xs font-semibold transition-colors',
                page === currentPage
                  ? 'bg-primary text-primary-foreground'
                  : cn(buttonVariants({ variant: 'outline', size: 'icon-sm' })),
              )}
            >
              {page}
            </button>
          );
        })}

        <button
          onClick={() => go(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'icon-sm' }),
            'disabled:opacity-30 disabled:pointer-events-none',
          )}
        >
          <ChevronRight size={13} />
        </button>
      </div>
    </div>
  );
}

function computePages(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4)            return [1, 2, 3, 4, 5, -1, total];
  if (current >= total - 3)   return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
  return [1, -1, current - 1, current, current + 1, -1, total];
}
