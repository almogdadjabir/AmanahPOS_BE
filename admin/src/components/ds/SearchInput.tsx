'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

interface SearchInputProps {
  placeholder?: string;
  paramName?: string;
  debounce?: number;
  className?: string;
}

export default function SearchInput({
  placeholder = 'Search…',
  paramName = 'search',
  debounce = 300,
  className = '',
}: SearchInputProps) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [value, setValue] = useState(searchParams.get(paramName) ?? '');
  const timer = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    setValue(searchParams.get(paramName) ?? '');
  }, [searchParams, paramName]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value;
    setValue(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString());
      if (next.trim()) {
        params.set(paramName, next.trim());
      } else {
        params.delete(paramName);
      }
      params.delete('page');
      router.push(`${pathname}?${params.toString()}`);
    }, debounce);
  }

  return (
    <div className={`relative ${className}`}>
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-hint pointer-events-none">
        <SearchIcon />
      </span>
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full h-9 pl-9 pr-3 rounded-lg border border-border-soft bg-white text-[13px] text-text-primary placeholder:text-text-hint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
      />
      {value && (
        <button
          onClick={() => {
            setValue('');
            const params = new URLSearchParams(searchParams.toString());
            params.delete(paramName);
            params.delete('page');
            router.push(`${pathname}?${params.toString()}`);
          }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-hint hover:text-text-primary"
        >
          <XIcon />
        </button>
      )}
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  );
}
function XIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}
