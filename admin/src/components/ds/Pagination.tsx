'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

interface PaginationProps {
  count: number;
  pageSize?: number;
  className?: string;
}

export default function Pagination({ count, pageSize = 20, className = '' }: PaginationProps) {
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
    <div className={`flex items-center justify-between px-4 py-3 border-t border-border-soft ${className}`}>
      <p className="text-[12px] text-text-hint">
        Showing <span className="font-semibold text-text-secondary">{start}–{end}</span> of <span className="font-semibold text-text-secondary">{count}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => go(currentPage - 1)}
          disabled={currentPage <= 1}
          className="h-7 w-7 flex items-center justify-center rounded-md border border-border-soft text-text-hint hover:bg-surface-soft hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronLeft />
        </button>
        {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
          const page = computePages(currentPage, totalPages)[i];
          if (!page) return null;
          if (page === -1) return (
            <span key={`dots-${i}`} className="h-7 w-7 flex items-center justify-center text-[11px] text-text-hint">…</span>
          );
          return (
            <button
              key={page}
              onClick={() => go(page)}
              className={`h-7 min-w-[28px] px-1.5 flex items-center justify-center rounded-md text-[12px] font-semibold transition-colors ${
                page === currentPage
                  ? 'bg-primary text-white'
                  : 'border border-border-soft text-text-secondary hover:bg-surface-soft hover:text-text-primary'
              }`}
            >
              {page}
            </button>
          );
        })}
        <button
          onClick={() => go(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className="h-7 w-7 flex items-center justify-center rounded-md border border-border-soft text-text-hint hover:bg-surface-soft hover:text-text-primary disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ChevronRight />
        </button>
      </div>
    </div>
  );
}

function computePages(current: number, total: number): number[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, -1, total];
  if (current >= total - 3) return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
  return [1, -1, current - 1, current, current + 1, -1, total];
}

function ChevronLeft()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>; }
function ChevronRight() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>; }
