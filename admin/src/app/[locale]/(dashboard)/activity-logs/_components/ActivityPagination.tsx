'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Props {
  count:       number;
  currentPage: number;
  pageSize:    number;
}

export default function ActivityPagination({ count, currentPage, pageSize }: Props) {
  const t = useTranslations('activityLog');
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.ceil(count / pageSize);

  const goTo = useCallback((page: number) => {
    const p = new URLSearchParams(searchParams.toString());
    p.set('page', String(page));
    router.push(`${pathname}?${p.toString()}`);
  }, [router, pathname, searchParams]);

  if (totalPages <= 1) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end   = Math.min(currentPage * pageSize, count);

  return (
    <div className="flex items-center justify-between pt-4 border-t border-border/50 mt-4">
      <p className="text-[12px] text-muted-foreground">
        {start}–{end} {t('eventsOf')} {count} {t('events')}
      </p>

      <div className="flex items-center gap-1">
        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage <= 1}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            currentPage <= 1
              ? 'text-muted-foreground/30 cursor-not-allowed'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <ChevronLeft size={15} />
        </button>

        <span className="text-[12px] text-muted-foreground px-2">
          {currentPage} / {totalPages}
        </span>

        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
            currentPage >= totalPages
              ? 'text-muted-foreground/30 cursor-not-allowed'
              : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
        >
          <ChevronRight size={15} />
        </button>
      </div>
    </div>
  );
}
