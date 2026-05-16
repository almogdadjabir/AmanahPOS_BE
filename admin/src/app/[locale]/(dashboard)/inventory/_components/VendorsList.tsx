'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle, Mail, Phone, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  deactivateVendorAction,
  fetchVendorsManagementAction,
  reactivateVendorAction,
} from '@/actions/inventory';
import type { Vendor } from '@/types/api';
import VendorDrawer from './VendorDrawer';

export default function VendorsList() {
  const t = useTranslations('inventory');
  const [vendors,    setVendors]    = useState<Vendor[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState<string | null>(null);
  const [rawSearch,  setRawSearch]  = useState('');
  const [search,     setSearch]     = useState('');
  const [showAll,    setShowAll]    = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editing,    setEditing]    = useState<Vendor | null>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await fetchVendorsManagementAction({ search, showAll });
    if (res.ok) setVendors(res.data);
    else        setError(res.error);
    setLoading(false);
  }, [search, showAll]);

  useEffect(() => { load(); }, [load]);

  // Clean up debounce timer on unmount
  useEffect(() => {
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
  }, []);

  function handleSearchChange(val: string) {
    setRawSearch(val);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setSearch(val), 300);
  }

  function openAdd()            { setEditing(null);  setDrawerOpen(true); }
  function openEdit(v: Vendor)  { setEditing(v);     setDrawerOpen(true); }
  function closeDrawer()        { setDrawerOpen(false); }

  function handleSaved(saved: Vendor) {
    setDrawerOpen(false);
    setVendors(prev => {
      const exists = prev.find(v => v.id === saved.id);
      return exists
        ? prev.map(v => v.id === saved.id ? saved : v)
        : [saved, ...prev];
    });
  }

  async function handleDeactivate(id: string) {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, is_active: false } : v));
    const res = await deactivateVendorAction(id);
    if (!res.ok) load();
  }

  async function handleReactivate(id: string) {
    setVendors(prev => prev.map(v => v.id === id ? { ...v, is_active: true } : v));
    const res = await reactivateVendorAction(id);
    if (!res.ok) load();
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4">
        <input
          type="text"
          value={rawSearch}
          onChange={e => handleSearchChange(e.target.value)}
          placeholder={t('vendors.searchPlaceholder')}
          className="flex-1 rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-colors"
        />
        <button
          type="button"
          onClick={() => setShowAll(p => !p)}
          className={cn(
            'px-3 py-2 rounded-lg text-xs font-semibold border transition-colors shrink-0',
            showAll
              ? 'bg-foreground text-background border-foreground'
              : 'bg-background text-muted-foreground border-border hover:text-foreground',
          )}
        >
          {showAll ? t('vendors.activeOnly') : t('vendors.showAll')}
        </button>
        <Button size="sm" onClick={openAdd} className="shrink-0">
          <Plus size={14} />
          {t('vendors.addVendor')}
        </Button>
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[60px] rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <AlertCircle size={14} className="text-destructive shrink-0" />
          <p className="text-xs font-semibold text-destructive flex-1">{error}</p>
          <button type="button" onClick={load} className="text-xs text-primary hover:underline">
            {t('common.retry')}
          </button>
        </div>
      ) : vendors.length === 0 ? (
        <p className="text-sm text-muted-foreground italic text-center py-12">
          {rawSearch ? t('vendors.emptySearch') : t('vendors.empty')}
        </p>
      ) : (
        <div className="space-y-2">
          {vendors.map(vendor => (
            <div
              key={vendor.id}
              className={cn(
                'flex items-center gap-3 rounded-xl border border-border bg-card p-3.5 transition-opacity',
                !vendor.is_active && 'opacity-50',
              )}
            >
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-foreground truncate">{vendor.name}</p>
                <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                  {vendor.phone && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Phone size={10} />{vendor.phone}
                    </span>
                  )}
                  {vendor.email && (
                    <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                      <Mail size={10} />{vendor.email}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className={cn(
                  'text-[10px] font-bold px-2 py-0.5 rounded-full',
                  vendor.is_active
                    ? 'bg-success/10 text-success'
                    : 'bg-muted text-muted-foreground',
                )}>
                  {vendor.is_active ? t('vendors.active') : t('vendors.inactive')}
                </span>
                <button
                  type="button"
                  onClick={() => openEdit(vendor)}
                  className="text-[11px] font-semibold text-primary hover:underline"
                >
                  {t('common.edit')}
                </button>
                {vendor.is_active ? (
                  <button
                    type="button"
                    onClick={() => handleDeactivate(vendor.id)}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-destructive transition-colors"
                  >
                    {t('vendors.deactivate')}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleReactivate(vendor.id)}
                    className="text-[11px] font-semibold text-muted-foreground hover:text-primary transition-colors"
                  >
                    {t('vendors.reactivate')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <VendorDrawer
        open={drawerOpen}
        vendor={editing}
        onClose={closeDrawer}
        onSuccess={handleSaved}
      />
    </div>
  );
}
