'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { searchOwnersAction } from '../../actions';

interface UserOption {
  id:        string;
  full_name: string;
  phone:     string;
  role:      string;
}

interface Props {
  value?: UserOption | null;
  onChange: (user: UserOption | null) => void;
  placeholder?: string;
}

export default function UserSearchSelector({ value, onChange, placeholder }: Props) {
  const [query,   setQuery]   = useState('');
  const [results, setResults] = useState<UserOption[]>([]);
  const [open,    setOpen]    = useState(false);
  const [loading, setLoading] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return; }
    clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const results = await searchOwnersAction(query);
        setResults(results);
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timer.current);
  }, [query]);

  if (value) {
    return (
      <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/30">
        <div>
          <p className="text-sm font-semibold text-foreground">{value.full_name}</p>
          <p className="text-xs text-muted-foreground">{value.phone} · {value.role}</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
        >
          <X size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search size={14} className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder ?? 'Search by name or phone…'}
          className="w-full ps-9 pe-3 py-2.5 text-sm border border-border rounded-xl bg-background focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {loading && (
          <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">…</span>
        )}
      </div>

      {open && results.length > 0 && (
        <div className="absolute z-20 w-full mt-1 bg-card border border-border rounded-xl shadow-lg overflow-hidden">
          {results.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => { onChange(u); setOpen(false); setQuery(''); }}
              className="w-full text-start px-4 py-2.5 hover:bg-muted transition-colors border-b border-border last:border-0"
            >
              <p className="text-sm font-semibold text-foreground">{u.full_name}</p>
              <p className="text-xs text-muted-foreground">{u.phone}</p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
