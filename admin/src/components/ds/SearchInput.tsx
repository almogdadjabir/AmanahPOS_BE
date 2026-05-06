'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useTransition } from 'react';
import { Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SearchInputProps {
  placeholder?: string;
  className?:   string;
  debounce?:    number;
}

export default function SearchInput({ placeholder = 'Search…', className, debounce = 300 }: SearchInputProps) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const value = searchParams.get('search') ?? '';

  const update = useCallback((val: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (val) {
      params.set('search', val);
    } else {
      params.delete('search');
    }
    params.delete('page');
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }, [router, pathname, searchParams]);

  let timer: ReturnType<typeof setTimeout>;
  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    clearTimeout(timer);
    timer = setTimeout(() => update(e.target.value), debounce);
  }

  return (
    <div className={cn('relative', className)}>
      <Search
        size={14}
        className="absolute inset-y-0 start-3 my-auto text-muted-foreground pointer-events-none"
      />
      <input
        type="search"
        defaultValue={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          'flex h-9 w-full rounded-md border border-input bg-background ps-9 pe-9 py-2 text-sm',
          'text-foreground placeholder:text-muted-foreground',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
          'transition-colors',
        )}
      />
      {value && (
        <button
          type="button"
          onClick={() => update('')}
          className="absolute inset-y-0 end-2.5 my-auto flex items-center justify-center w-5 h-5 rounded-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
