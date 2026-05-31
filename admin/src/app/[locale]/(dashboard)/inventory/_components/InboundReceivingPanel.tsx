'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { AlertCircle, ArrowDownToLine, Lock, Plus, Trash2, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Drawer from '@/components/ds/Drawer';
import {
  createInboundTransactionAction,
  fetchProductsForShopAction,
  fetchVendorsAction,
  type InboundState,
} from '@/actions/inventory';
import type { Shop, Product, Vendor } from '@/types/api';

// ── Public export ─────────────────────────────────────────────────────────────

interface Props {
  enabled: boolean;
  shops:   Shop[];
}

export default function InboundReceivingPanel({ enabled, shops }: Props) {
  const t = useTranslations('inventory');
  const [open, setOpen] = useState(false);
  const router = useRouter();

  if (!enabled) {
    return <PremiumLockedCard />;
  }

  if (shops.length === 0) {
    return null; // No shops configured — feature enabled but nothing to receive into
  }

  return (
    <>
      {/* Enabled premium panel header */}
      <div
        className="flex items-center justify-between rounded-xl px-4 py-3.5 mb-5"
        style={{
          background: 'linear-gradient(135deg, rgba(120,53,15,0.06) 0%, rgba(217,119,6,0.02) 100%)',
          border: '1px solid rgba(217,119,6,0.18)',
          borderLeft: '3px solid rgba(180,83,9,0.55)',
        }}
      >
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold text-foreground">{t('inbound.sectionTitle')}</p>
            <span
              className="inline-flex items-center gap-1 text-[9px] font-black tracking-[0.12em] uppercase px-1.5 py-0.5 rounded-full"
              style={{
                background: 'rgba(217,119,6,0.10)',
                border: '1px solid rgba(217,119,6,0.25)',
                color: 'rgb(146,64,14)',
              }}
            >
              <Zap size={8} strokeWidth={2.5} />
              {t('inbound.premiumBadge')}
            </span>
          </div>
          <p className="text-[12px] text-muted-foreground mt-0.5">{t('inbound.sectionDesc')}</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 text-[13px] font-semibold transition-all hover:brightness-110 active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, rgb(180,83,9), rgb(146,64,14))',
            color: 'white',
            boxShadow: '0 1px 4px rgba(120,53,15,0.30), 0 0 0 1px rgba(120,53,15,0.08)',
          }}
        >
          <ArrowDownToLine size={13} strokeWidth={2.5} />
          {t('inbound.receiveBtn')}
        </button>
      </div>

      <InboundDrawer
        open={open}
        shops={shops}
        onClose={() => setOpen(false)}
        onSuccess={(_ref) => {
          setOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

// ── Locked card ───────────────────────────────────────────────────────────────

function PremiumLockedCard() {
  const t = useTranslations('inventory');
  return (
    <div
      className="relative overflow-hidden rounded-xl mb-5"
      style={{
        background:  'linear-gradient(135deg, rgba(120,53,15,0.16) 0%, rgba(180,83,9,0.09) 55%, rgba(217,119,6,0.04) 100%)',
        border:      '1px solid rgba(217,119,6,0.22)',
        boxShadow:   'inset 0 1px 0 rgba(251,191,36,0.14), 0 2px 16px rgba(120,53,15,0.08)',
      }}
    >
      {/* Shimmer sweep */}
      <div
        className="absolute inset-0 pointer-events-none animate-premium-shimmer"
        style={{ background: 'linear-gradient(105deg, transparent 35%, rgba(251,191,36,0.07) 50%, transparent 65%)' }}
        aria-hidden
      />

      {/* Top gold accent line */}
      <div
        className="absolute top-0 left-8 right-8 h-px pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(251,191,36,0.55), transparent)' }}
        aria-hidden
      />

      <div className="relative px-5 pt-5 pb-4">
        {/* PREMIUM badge */}
        <div className="mb-4">
          <span
            className="inline-flex items-center gap-1.5 text-[10px] font-black tracking-[0.13em] uppercase px-2.5 py-1 rounded-full"
            style={{
              background:  'linear-gradient(135deg, rgba(217,119,6,0.16), rgba(245,158,11,0.08))',
              border:      '1px solid rgba(217,119,6,0.28)',
              color:       'rgb(146,64,14)',
              boxShadow:   '0 0 10px rgba(217,119,6,0.10)',
            }}
          >
            <Zap size={9} strokeWidth={2.5} />
            {t('inbound.premiumBadge')}
          </span>
        </div>

        <div className="flex items-start gap-4">
          {/* Architectural lock frame */}
          <div
            className="shrink-0 mt-0.5 flex items-center justify-center"
            style={{
              width:        48,
              height:       48,
              background:   'linear-gradient(145deg, rgba(120,53,15,0.32), rgba(146,64,14,0.16))',
              border:       '1px solid rgba(217,119,6,0.26)',
              borderRadius: 14,
              boxShadow:    '0 2px 10px rgba(120,53,15,0.16), inset 0 1px 0 rgba(251,191,36,0.16)',
            }}
          >
            <Lock size={20} strokeWidth={2} style={{ color: 'rgb(146,64,14)' }} />
          </div>

          <div className="min-w-0 flex-1">
            <p
              className="text-[15px] font-bold leading-snug mb-1.5"
              style={{ color: 'rgb(101,40,8)' }}
            >
              {t('inbound.premiumTitle')}
            </p>
            <p className="text-[12px] text-muted-foreground leading-relaxed">
              {t('inbound.premiumDesc')}
            </p>
          </div>
        </div>
      </div>

      {/* Decorative dot grid — bottom-right */}
      <div
        className="absolute bottom-3 right-4 pointer-events-none select-none"
        style={{ opacity: 0.055 }}
        aria-hidden
      >
        <svg width="52" height="28" viewBox="0 0 52 28" fill="none">
          {[0,9,18,27,36,45].flatMap(x =>
            [0,9,18].map(y => (
              <circle key={`${x}-${y}`} cx={x + 4} cy={y + 4} r={1.8} fill="rgb(146,64,14)" />
            ))
          )}
        </svg>
      </div>
    </div>
  );
}

// ── Drawer ────────────────────────────────────────────────────────────────────

interface DrawerProps {
  open:      boolean;
  shops:     Shop[];
  onClose:   () => void;
  onSuccess: (reference: string) => void;
}

function InboundDrawer({ open, shops, onClose, onSuccess }: DrawerProps) {
  const t = useTranslations('inventory');
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={t('inbound.drawerTitle')}
      subtitle={t('inbound.drawerSubtitle')}
    >
      {open && (
        <DrawerContent
          key={String(open)}
          shops={shops}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    </Drawer>
  );
}

// ── DrawerContent (form) ──────────────────────────────────────────────────────

type ItemRow = {
  _id:          string;
  product_id:   string;
  quantity:     string;
  unit_cost:    string;
  expiry_date:  string;
  batch_number: string;
};

function newRow(): ItemRow {
  return {
    _id:          crypto.randomUUID(),
    product_id:   '',
    quantity:     '',
    unit_cost:    '',
    expiry_date:  '',
    batch_number: '',
  };
}

function DrawerContent({
  shops,
  onClose,
  onSuccess,
}: {
  shops:     Shop[];
  onClose:   () => void;
  onSuccess: (reference: string) => void;
}) {
  const t = useTranslations('inventory');

  const defaultShop = shops[0]?.id ?? '';
  const [shopId,   setShopId]   = useState(defaultShop);
  const [vendorId, setVendorId] = useState('');
  const [rows,     setRows]     = useState<ItemRow[]>([newRow()]);
  const [products,        setProducts]        = useState<Product[]>([]);
  const [vendors,         setVendors]         = useState<Vendor[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingVendors,  setLoadingVendors]  = useState(false);

  const [state, dispatch, isPending] = useActionState<InboundState, FormData>(
    createInboundTransactionAction,
    null,
  );

  useEffect(() => {
    if (!shopId) return;
    let ignored = false;
    setRows([newRow()]);
    setProducts([]);
    setLoadingProducts(true);
    fetchProductsForShopAction(shopId).then((res) => {
      if (ignored) return;
      setProducts(res.ok ? res.data : []);
      setLoadingProducts(false);
    });
    return () => { ignored = true; };
  }, [shopId]);

  // Fetch active vendors once when drawer mounts
  useEffect(() => {
    let ignored = false;
    setLoadingVendors(true);
    fetchVendorsAction().then((res) => {
      if (ignored) return;
      const list = res.ok ? res.data : [];
      setVendors(list);
      if (list.length > 0) setVendorId(list[0].id);
      setLoadingVendors(false);
    });
    return () => { ignored = true; };
  }, []);

  useEffect(() => {
    if (state && 'success' in state) {
      onSuccess(state.reference);
    }
  }, [state, onSuccess]);

  const error = state && 'error' in state ? state.error : null;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    const form = e.currentTarget;
    const hiddenItems = form.querySelector<HTMLInputElement>('[name="items"]')!;
    hiddenItems.value = JSON.stringify(
      rows.map(({ product_id, quantity, unit_cost, expiry_date, batch_number }) => ({
        product_id,
        quantity,
        unit_cost:    unit_cost    || undefined,
        expiry_date:  expiry_date  || undefined,
        batch_number: batch_number || undefined,
      })),
    );
  }

  function addRow() {
    setRows(r => [...r, newRow()]);
  }

  function removeRow(id: string) {
    setRows(r => r.filter(row => row._id !== id));
  }

  function updateRow(id: string, field: keyof Omit<ItemRow, '_id'>, value: string) {
    setRows(r => r.map(row => row._id === id ? { ...row, [field]: value } : row));
  }

  return (
    <form
      action={dispatch}
      onSubmit={handleSubmit}
      className="flex flex-col h-full"
    >
      <div className="flex-1 overflow-y-auto">
        <div className="p-5 space-y-5">
          {error && <FormError message={error} />}

          <input type="hidden" name="items" />

          {shops.length > 1 ? (
            <div>
              <label className="text-sm font-semibold text-foreground block mb-1.5">
                {t('inbound.shop')}
              </label>
              <select
                name="shop"
                value={shopId}
                onChange={e => setShopId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {shops.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          ) : (
            <input type="hidden" name="shop" value={defaultShop} />
          )}

          {/* Vendor selector — required, fetched on mount */}
          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">
              {t('inbound.vendor')}
            </label>
            {loadingVendors ? (
              <p className="text-xs text-muted-foreground py-2">{t('inbound.vendorLoading')}</p>
            ) : vendors.length === 0 ? (
              <p className="text-xs text-amber-600 italic py-2">{t('inbound.noVendors')}</p>
            ) : (
              <select
                name="vendor_id"
                value={vendorId}
                onChange={e => setVendorId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {vendors.map(v => (
                  <option key={v.id} value={v.id}>{v.name}</option>
                ))}
              </select>
            )}
          </div>

          <Input
            label={t('inbound.reference')}
            name="reference"
            type="text"
            required
            placeholder={t('inbound.referencePlaceholder')}
          />

          <div>
            <label className="text-sm font-semibold text-foreground block mb-1.5">
              {t('inbound.notes')}{' '}
              <span className="text-muted-foreground font-normal">{t('inbound.notesOptional')}</span>
            </label>
            <textarea
              name="notes"
              placeholder={t('inbound.notesPlaceholder')}
              rows={2}
              className="flex w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors resize-none"
            />
          </div>

          <div>
            <p className="text-sm font-semibold text-foreground mb-2">{t('inbound.itemsTitle')}</p>

            {loadingProducts ? (
              <p className="text-xs text-muted-foreground py-2">{t('inbound.loadingProducts')}</p>
            ) : products.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-2">{t('inbound.noProducts')}</p>
            ) : (
              <div className="space-y-3">
                {rows.map((row, idx) => (
                  <ItemRowEditor
                    key={row._id}
                    row={row}
                    index={idx}
                    products={products}
                    canRemove={rows.length > 1}
                    onUpdate={(field, value) => updateRow(row._id, field, value)}
                    onRemove={() => removeRow(row._id)}
                    removeLabel={t('inbound.removeItem')}
                  />
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={addRow}
              disabled={products.length === 0}
              className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline disabled:opacity-40 disabled:pointer-events-none"
            >
              <Plus size={12} />
              {t('inbound.addItem')}
            </button>
          </div>
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
        <Button variant="secondary" size="sm" type="button" onClick={onClose}>
          {t('inbound.cancel')}
        </Button>
        <Button size="sm" type="submit" disabled={isPending || products.length === 0 || vendors.length === 0 || loadingVendors}>
          {isPending ? t('inbound.submitting') : t('inbound.submit')}
        </Button>
      </div>
    </form>
  );
}

// ── Item row editor ───────────────────────────────────────────────────────────

function ItemRowEditor({
  row,
  index,
  products,
  canRemove,
  onUpdate,
  onRemove,
  removeLabel,
}: {
  row:         ItemRow;
  index:       number;
  products:    Product[];
  canRemove:   boolean;
  onUpdate:    (field: keyof Omit<ItemRow, '_id'>, value: string) => void;
  onRemove:    () => void;
  removeLabel: string;
}) {
  const t = useTranslations('inventory');
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide">
          #{index + 1}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="flex items-center gap-1 text-[11px] font-semibold text-destructive hover:underline"
          >
            <Trash2 size={11} />
            {removeLabel}
          </button>
        )}
      </div>

      <div>
        <label className="text-xs font-semibold text-foreground block mb-1">
          {t('inbound.product')}
        </label>
        <select
          value={row.product_id}
          onChange={e => onUpdate('product_id', e.target.value)}
          required
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <option value="">{t('inbound.productPlaceholder')}</option>
          {products.map(p => (
            <option key={p.id} value={p.id}>
              {p.name}{p.sku ? ` (${p.sku})` : ''}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            {t('inbound.quantity')}
          </label>
          <input
            type="number"
            min="0.001"
            step="0.001"
            required
            value={row.quantity}
            onChange={e => onUpdate('quantity', e.target.value)}
            placeholder="0"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            {t('inbound.unitCost')}{' '}
            <span className="text-muted-foreground font-normal">{t('inbound.unitCostOptional')}</span>
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={row.unit_cost}
            onChange={e => onUpdate('unit_cost', e.target.value)}
            placeholder="0.00"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            {t('inbound.expiryDate')}{' '}
            <span className="text-muted-foreground font-normal">{t('inbound.expiryDateOptional')}</span>
          </label>
          <input
            type="date"
            value={row.expiry_date}
            onChange={e => onUpdate('expiry_date', e.target.value)}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
        <div>
          <label className="text-xs font-semibold text-foreground block mb-1">
            {t('inbound.batchNumber')}{' '}
            <span className="text-muted-foreground font-normal">{t('inbound.batchNumberOptional')}</span>
          </label>
          <input
            type="text"
            value={row.batch_number}
            onChange={e => onUpdate('batch_number', e.target.value)}
            placeholder="LOT-001"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>
    </div>
  );
}

// ── FormError ─────────────────────────────────────────────────────────────────

function FormError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-3">
      <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
      <p className="text-xs font-semibold text-destructive leading-relaxed">{message}</p>
    </div>
  );
}
