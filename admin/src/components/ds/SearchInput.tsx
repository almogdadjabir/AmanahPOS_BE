"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchInputProps {
  placeholder?: string;
  className?: string;
  debounce?: number;
}

export default function SearchInput({
  placeholder = "Search…",
  className,
  debounce = 300,
}: SearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const queryValue = searchParams.get("search") ?? "";
  const [value, setValue] = useState(queryValue);

  useEffect(() => {
    setValue(queryValue);
  }, [queryValue]);

  const update = useCallback(
    (val: string) => {
      const params = new URLSearchParams(searchParams.toString());
      const cleanValue = val.trim();

      if (cleanValue) {
        params.set("search", cleanValue);
      } else {
        params.delete("search");
      }

      params.delete("page");

      const query = params.toString();
      startTransition(() => {
        router.push(query ? `${pathname}?${query}` : pathname);
      });
    },
    [router, pathname, searchParams],
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const nextValue = e.target.value;
    setValue(nextValue);

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      update(nextValue);
    }, debounce);
  }

  function handleClear() {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    setValue("");
    update("");
  }

  return (
    <div className={cn("relative", className)}>
      <Search
        size={15}
        className="absolute inset-y-0 start-3 my-auto text-muted-foreground pointer-events-none"
      />

      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder={placeholder}
        className={cn(
          "flex h-9 w-full rounded-lg border border-input bg-background ps-9 pe-9 py-2 text-sm",
          "text-foreground placeholder:text-muted-foreground",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-ring",
          "transition-colors",
        )}
      />

      {value.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className={cn(
            "absolute inset-y-0 end-2.5 my-auto flex h-5 w-5 items-center justify-center rounded-full",
            "text-muted-foreground hover:text-foreground hover:bg-muted",
            "transition-colors",
          )}
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
