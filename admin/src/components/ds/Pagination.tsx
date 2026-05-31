'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
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
  const [isPending, startTransition] = useTransition();

  const currentPage = Number(searchParams.get('page') ?? 1);
  const totalPages  = Math.max(1, Math.ceil(count / pageSize));

  if (totalPages <= 1) return null;

  function go(page: number) {
    if (page === currentPage) return;
    startTransition(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (page === 1) params.delete('page');
      else params.set('page', String(page));
      // scroll: false prevents the jarring scroll-to-top on every page change
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    });
  }

  const start = (currentPage - 1) * pageSize + 1;
  const end   = Math.min(currentPage * pageSize, count);

  return (
    <div
      className={cn(
        'flex items-center justify-between px-4 py-3 border-t border-border',
        isPending && 'opacity-60 pointer-events-none',
        'transition-opacity duration-150',
        className,
      )}
    >
      {/* Count label */}
      <p className="text-xs text-muted-foreground select-none">
        {t('showing')}{' '}
        <span className="font-semibold text-foreground tabular-nums">{start}–{end}</span>
        {' '}{t('of')}{' '}
        <span className="font-semibold text-foreground tabular-nums">{count}</span>
      </p>

      {/* Page controls */}
      <div className="flex items-center gap-1">
        {/* Prev */}
        <button
          onClick={() => go(currentPage - 1)}
          disabled={currentPage <= 1 || isPending}
          aria-label={t('previous')}
          className={cn(
            buttonVariants({ variant: 'outline', size: 'icon-sm' }),
            'disabled:opacity-30 disabled:pointer-events-none',
          )}
        >
          <ChevronLeft size={13} />
        </button>

        {/* Page numbers */}
        {computePages(currentPage, totalPages).map((page, i) => {
          if (page === -1) return (
            <span
              key={`dots-${i}`}
              className="h-7 w-7 flex items-center justify-center text-[11px] text-muted-foreground select-none"
            >
              …
            </span>
          );

          const isActive = page === currentPage;

          return (
            <button
              key={page}
              onClick={() => go(page)}
              disabled={isPending}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'h-7 min-w-[28px] px-1.5 flex items-center justify-center rounded-md text-xs font-semibold transition-all duration-150',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm ring-1 ring-primary/20'
                  : cn(
                      buttonVariants({ variant: 'outline', size: 'icon-sm' }),
                      'hover:bg-muted',
                    ),
              )}
            >
              {isActive && isPending
                ? <Loader2 size={11} className="animate-spin" />
                : page
              }
            </button>
          );
        })}

        {/* Next */}
        <button
          onClick={() => go(currentPage + 1)}
          disabled={currentPage >= totalPages || isPending}
          aria-label={t('next')}
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
  if (current <= 4)          return [1, 2, 3, 4, 5, -1, total];
  if (current >= total - 3)  return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
  return [1, -1, current - 1, current, current + 1, -1, total];
}
