'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { BusinessDrawerContext } from './BusinessDrawerContext';
import Drawer from '@/components/ds/Drawer';
import Avatar from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConfirmDialog from '@/components/ds/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  createBusinessAction,
  fetchBusinessDetailAction,
  toggleBusinessStatusAction,
  updateBusinessAction,
  type CreateBusinessState,
  type UpdateBusinessState,
  type BusinessDetailResult,
} from '@/actions/businesses';
import type { AdminBusinessDetail, AdminBusinessShop } from '@/types/api';
import { cn } from '@/lib/utils';
import {
  Phone, Mail, MapPin, Calendar, Clock, Edit2, Ban, Check, X, Info,
  ShoppingBag, Store, CreditCard,
  Search, ChevronRight, ArrowLeft, CheckCircle2, Loader2,
} from 'lucide-react';
import { searchOwnersAction } from '@/actions/subscriptions';
import type { AdminOwner } from '@/types/api';

export default function BusinessesDrawerShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [viewId,     setViewId]     = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  function openView(id: string)  { setViewId(id); }
  function openCreate()          { setCreateOpen(true); }
  function closeCreate()         { setCreateOpen(false); }
  function closeView()           { setViewId(null); }

  function handleCreateSuccess(id: string) {
    setCreateOpen(false);
    setViewId(id);
    router.refresh();
  }

  return (
    <BusinessDrawerContext.Provider value={{ openView, openCreate }}>
      {children}

      <Drawer
        open={createOpen}
        onClose={closeCreate}
        title="Create Business"
        subtitle="Register a new business under an owner"
        width={480}
      >
        <CreateBusinessContent onSuccess={handleCreateSuccess} onClose={closeCreate} />
      </Drawer>

      <Drawer open={!!viewId} onClose={closeView} title="Business Details" width={560}>
        {viewId && (
          <BusinessDetailContent
            businessId={viewId}
            onClose={closeView}
            onMutate={() => { router.refresh(); }}
          />
        )}
      </Drawer>
    </BusinessDrawerContext.Provider>
  );
}

// ── Create Business ───────────────────────────────────────────────────────────

type SelectedOwner = {
  ownerId:    string;
  ownerName:  string;
  ownerPhone: string;
};

function CreateStepBar({ step }: { step: 'search' | 'form' }) {
  const atForm = step === 'form';
  return (
    <div className="px-5 py-3.5 border-b border-border/60 bg-muted/20">
      <div className="flex items-center gap-2">
        {/* Step 1 */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-bold shadow-sm shadow-primary/20">
            {atForm ? <Check size={10} strokeWidth={3} /> : '1'}
          </span>
          <span className={cn(
            'text-[11px] font-semibold transition-colors duration-300',
            !atForm ? 'text-foreground' : 'text-muted-foreground',
          )}>
            Select Owner
          </span>
        </div>

        {/* Connecting line */}
        <div className="flex-1 h-[2px] rounded-full bg-border/60 overflow-hidden mx-1">
          <div className={cn(
            'h-full rounded-full bg-primary transition-all duration-500 ease-out',
            atForm ? 'w-full' : 'w-0',
          )} />
        </div>

        {/* Step 2 */}
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn(
            'w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300',
            atForm
              ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/20'
              : 'bg-muted text-muted-foreground border border-border',
          )}>
            2
          </span>
          <span className={cn(
            'text-[11px] font-semibold transition-colors duration-300',
            atForm ? 'text-foreground' : 'text-muted-foreground',
          )}>
            Business Details
          </span>
        </div>
      </div>
    </div>
  );
}

function CreateBusinessContent({
  onSuccess,
  onClose,
}: {
  onSuccess: (id: string) => void;
  onClose:   () => void;
}) {
  const [state, dispatch, isPending] = useActionState<CreateBusinessState, FormData>(
    createBusinessAction, null,
  );

  const [step,          setStep]          = useState<'search' | 'form'>('search');
  const [selected,      setSelected]      = useState<SelectedOwner | null>(null);
  const [searchQuery,   setSearchQuery]   = useState('');
  const [searchResults, setSearchResults] = useState<AdminOwner[]>([]);
  const [searching,     setSearching]     = useState(false);
  const [searchErr,     setSearchErr]     = useState<string | null>(null);

  useEffect(() => {
    if (!searchQuery.trim()) { setSearchResults([]); setSearchErr(null); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      setSearchErr(null);
      const result = await searchOwnersAction(searchQuery);
      if (result.ok) setSearchResults(result.data);
      else setSearchErr(result.error);
      setSearching(false);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  function handleOwnerSelect(owner: AdminOwner) {
    setSelected({ ownerId: owner.id, ownerName: owner.full_name, ownerPhone: owner.phone });
    setStep('form');
  }

  useEffect(() => {
    if (state && 'success' in state && state.success) onSuccess(state.business_id);
  }, [state, onSuccess]);

  const error = state && 'error' in state ? state.error : null;

  return (
    <div className="flex flex-col h-full">
      <CreateStepBar step={step} />

      {/* ── Step 1: Search ─────────────────────────────────────────────────── */}
      {step === 'search' && (
        <div className="flex-1 overflow-y-auto p-5 space-y-4 animate-in fade-in-0 slide-in-from-left-2 duration-200">
          <p className="text-[11.5px] text-muted-foreground leading-relaxed">
            Search by name, phone, or email to find the owner account.
          </p>

          {/* Search input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Name, phone, or email…"
              autoFocus
              className={cn(inputCls, 'pl-9 pr-9')}
            />
            {searching && (
              <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
            )}
          </div>

          {/* Search error */}
          {searchErr && (
            <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2.5">
              <p className="text-xs font-semibold text-destructive">{searchErr}</p>
            </div>
          )}

          {/* Results */}
          {searchResults.length > 0 && (
            <div className="space-y-1.5">
              {searchResults.map((owner, i) => (
                <button
                  key={owner.id}
                  type="button"
                  onClick={() => handleOwnerSelect(owner)}
                  style={{ animationDelay: `${i * 35}ms` }}
                  className="w-full group flex items-center gap-3 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/[0.025] px-3.5 py-3 transition-all text-left animate-in fade-in-0 slide-in-from-bottom-1 duration-150"
                >
                  {/* Avatar with status dot */}
                  <div className="relative shrink-0">
                    <span className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-[13px] font-bold text-primary">
                      {owner.full_name.charAt(0).toUpperCase()}
                    </span>
                    <span className={cn(
                      'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-[1.5px] border-card',
                      owner.is_active ? 'bg-success' : 'bg-muted-foreground/50',
                    )} />
                  </div>

                  {/* Name + phone */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-semibold text-foreground truncate">{owner.full_name}</p>
                      {owner.is_verified && (
                        <CheckCircle2 size={11} className="text-primary/70 shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{owner.phone}</p>
                  </div>

                  {/* Badges */}
                  <div className="shrink-0 flex flex-col items-end gap-1.5">
                    <span className={cn(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full leading-tight',
                      owner.has_active_subscription
                        ? 'bg-success/10 text-success'
                        : 'bg-muted text-muted-foreground',
                    )}>
                      {owner.has_active_subscription ? 'Active plan' : 'No plan'}
                    </span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {owner.business_count} {owner.business_count === 1 ? 'business' : 'businesses'}
                    </span>
                  </div>

                  <ChevronRight size={13} className="text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          )}

          {/* No results */}
          {!searching && searchQuery.trim() && searchResults.length === 0 && !searchErr && (
            <div className="rounded-xl border border-border/50 bg-muted/20 px-4 py-8 text-center">
              <p className="text-sm font-semibold text-foreground mb-1">No owners found</p>
              <p className="text-[11.5px] text-muted-foreground">Try a different name, phone, or email</p>
            </div>
          )}

          {/* Idle */}
          {!searchQuery.trim() && (
            <div className="rounded-xl border border-dashed border-border/50 bg-muted/10 px-4 py-10 flex flex-col items-center gap-2 text-center">
              <span className="w-10 h-10 rounded-full bg-muted/70 flex items-center justify-center mb-1">
                <Search size={16} className="text-muted-foreground/50" />
              </span>
              <p className="text-[12px] font-semibold text-muted-foreground">Find an owner to continue</p>
              <p className="text-[11px] text-muted-foreground/60 max-w-[190px]">
                Search by name, phone number, or email address
              </p>
            </div>
          )}

          <div className="pt-2 border-t border-border flex justify-end">
            <Button variant="secondary" size="sm" type="button" onClick={onClose}>Cancel</Button>
          </div>
        </div>
      )}

      {/* ── Step 2: Business Details ────────────────────────────────────────── */}
      {step === 'form' && (
        <div className="flex-1 overflow-y-auto animate-in fade-in-0 slide-in-from-right-2 duration-200">
          <div className="p-5 space-y-5">
            {/* Selected owner card */}
            <div className="relative rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-primary via-primary/50 to-transparent" />
              <div className="p-3.5 flex items-center gap-3">
                <div className="relative shrink-0">
                  <span className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[14px] font-bold text-primary">
                    {selected!.ownerName.charAt(0).toUpperCase()}
                  </span>
                  <span className="absolute -bottom-0.5 -right-0.5 w-[11px] h-[11px] rounded-full bg-success border-2 border-card" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-bold text-foreground leading-tight truncate">{selected!.ownerName}</p>
                  <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{selected!.ownerPhone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('search')}
                  className="shrink-0 flex items-center gap-1.5 text-[11px] font-semibold text-primary hover:text-primary/70 transition-colors"
                >
                  <ArrowLeft size={10} />
                  Change
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-2.5">
                <p className="text-xs font-semibold text-destructive">{error}</p>
              </div>
            )}

            {/* Form */}
            <form action={dispatch} className="space-y-4">
              <input type="hidden" name="owner_phone" value={selected!.ownerPhone} />

              <CreateFormField label="Business name" required>
                <input
                  name="name"
                  type="text"
                  placeholder="e.g. Al-Hassan Trading"
                  required
                  autoFocus
                  className={inputCls}
                />
              </CreateFormField>

              <CreateFormField label="Address" hint="Optional physical address of this business.">
                <div className="relative">
                  <MapPin size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                  <input
                    name="address"
                    type="text"
                    placeholder="e.g. Block 5, Khartoum North"
                    className={cn(inputCls, 'pl-9')}
                  />
                </div>
              </CreateFormField>

              <div className="grid grid-cols-2 gap-3">
                <CreateFormField label="Phone">
                  <div className="relative">
                    <Phone size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                    <input
                      name="phone"
                      type="tel"
                      placeholder="+249 91 234 567"
                      className={cn(inputCls, 'pl-9')}
                    />
                  </div>
                </CreateFormField>
                <CreateFormField label="Email">
                  <div className="relative">
                    <Mail size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 pointer-events-none" />
                    <input
                      name="email"
                      type="email"
                      placeholder="biz@example.com"
                      className={cn(inputCls, 'pl-9')}
                    />
                  </div>
                </CreateFormField>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <Button variant="secondary" size="sm" type="button" onClick={onClose}>Cancel</Button>
                <Button variant="default" size="sm" type="submit" disabled={isPending}>
                  {isPending
                    ? <><Loader2 size={13} className="animate-spin" /> Creating…</>
                    : 'Create Business'
                  }
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateFormField({
  label, required, hint, children,
}: {
  label:     string;
  required?: boolean;
  hint?:     string;
  children:  React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-semibold text-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

// ── Business Detail ───────────────────────────────────────────────────────────

function BusinessDetailContent({
  businessId,
  onClose: _onClose,
  onMutate,
}: {
  businessId: string;
  onClose:    () => void;
  onMutate:   () => void;
}) {
  const [business, setBusiness] = useState<AdminBusinessDetail | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErrorMsg(null);
    const result: BusinessDetailResult = await fetchBusinessDetailAction(businessId);
    if (result.ok) {
      setBusiness(result.data);
    } else {
      setErrorMsg(result.error);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <DetailSkeleton />;

  if (errorMsg || !business) {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-destructive">Failed to load business</p>
          {errorMsg && (
            <p className="text-xs font-mono text-destructive/80 mt-1 break-all">{errorMsg}</p>
          )}
          <button onClick={load} className="mt-3 text-xs font-semibold text-primary hover:underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const created  = new Date(business.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const updated  = new Date(business.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  function handleMutate() { load(); onMutate(); }

  return (
    <div>
      {/* ── Profile banner ──────────────────────────────────────────────── */}
      <div className="relative">
        <div className="h-[72px] bg-gradient-to-br from-info/20 via-primary/10 to-transparent" />

        <div className="px-5 -mt-9 flex items-end gap-4 pb-4 border-b border-border">
          <div className="relative shrink-0">
            <div className="rounded-xl ring-4 ring-card overflow-hidden w-16 h-16 bg-primary/10 flex items-center justify-center">
              <span className="text-[24px] font-black text-primary uppercase">{business.name.charAt(0)}</span>
            </div>
            <span className={cn(
              'absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card',
              business.is_active ? 'bg-success' : 'bg-muted-foreground/50',
            )} />
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[17px] font-bold text-foreground leading-tight truncate">
                {business.name}
              </p>
              <Badge dot variant={business.is_active ? 'success' : 'danger'}>
                {business.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <p className="text-[11px] font-mono text-muted-foreground mt-1">{business.slug}</p>
          </div>
        </div>
      </div>

      {/* ── Owner + meta ─────────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-border/60 bg-muted/20 space-y-1">
        <MetaRow icon={<Avatar name={business.owner_name || business.owner_phone} size={14} />} value={business.owner_name || business.owner_phone} />
        <MetaRow icon={<Phone size={10} />}    value={business.owner_phone} mono />
        {business.phone   && <MetaRow icon={<Phone size={10} />}    value={business.phone} />}
        {business.email   && <MetaRow icon={<Mail size={10} />}     value={business.email} />}
        {business.address && <MetaRow icon={<MapPin size={10} />}   value={business.address} />}
        <MetaRow icon={<Calendar size={10} />} value={`Created ${created}`} />
        <MetaRow icon={<Clock size={10} />}    value={`Updated ${updated}`} />
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-border">
        <div className="grid grid-cols-3 gap-2">
          <StatBox
            label="Shops"
            value={String(business.shop_count)}
            color="text-primary"
            bg="bg-primary/10"
          />
          <StatBox
            label="Subscription"
            value={business.has_active_subscription ? 'Active' : 'No plan'}
            color={business.has_active_subscription ? 'text-success' : 'text-warning'}
            bg={business.has_active_subscription ? 'bg-success/10' : 'bg-warning/10'}
          />
          <StatBox
            label="Plan expiry"
            value={
              business.active_subscription
                ? `${business.active_subscription.days_remaining}d left`
                : '—'
            }
            color={
              business.active_subscription && business.active_subscription.days_remaining <= 7
                ? 'text-warning'
                : 'text-foreground'
            }
            bg="bg-muted"
          />
        </div>

        {business.active_subscription && (
          <div className="mt-2 flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 px-3 py-2">
            <CreditCard size={13} className="text-success shrink-0" />
            <p className="text-xs text-success font-semibold">
              {business.active_subscription.plan_name}
            </p>
            <span className="text-xs text-muted-foreground ms-auto">
              Expires {new Date(business.active_subscription.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
          </div>
        )}
      </div>

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-2 flex-wrap">
        <EditBusinessInline business={business} onSuccess={handleMutate} />
        <ToggleStatusInline business={business} onSuccess={handleMutate} />
      </div>

      {/* ── Shops ───────────────────────────────────────────────────────── */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center [&_svg]:size-3">
            <Store />
          </span>
          <p className="text-xs font-bold text-foreground">Shops</p>
          <span className="text-[11px] text-muted-foreground font-normal">({business.shops.length})</span>
        </div>

        {business.shops.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">No shops created yet.</p>
        ) : (
          <div className="space-y-2">
            {business.shops.map(shop => <ShopCard key={shop.id} shop={shop} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Detail Skeleton ───────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div>
      <div className="h-[72px] bg-muted/40" />
      <div className="px-5 -mt-9 flex items-end gap-4 pb-4 border-b border-border">
        <Skeleton className="w-16 h-16 rounded-xl ring-4 ring-card shrink-0" />
        <div className="flex-1 pb-1 space-y-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="px-5 py-3 border-b border-border space-y-2">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-3 w-48" />)}
      </div>
      <div className="px-5 py-4 border-b border-border">
        <div className="grid grid-cols-3 gap-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="rounded-lg bg-muted p-3 space-y-1.5">
              <Skeleton className="h-2 w-12" />
              <Skeleton className="h-4 w-8" />
            </div>
          ))}
        </div>
      </div>
      <div className="px-5 py-3.5 border-b border-border flex gap-2">
        <Skeleton className="h-8 w-16 rounded-md" />
        <Skeleton className="h-8 w-24 rounded-md" />
      </div>
    </div>
  );
}

// ── Shop card ─────────────────────────────────────────────────────────────────

function ShopCard({ shop }: { shop: AdminBusinessShop }) {
  const created = new Date(shop.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="px-3.5 py-3 flex items-center justify-between gap-3 bg-gradient-to-r from-muted/60 to-muted/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <ShoppingBag className="size-3.5 text-primary" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="text-[13px] font-bold text-foreground truncate">{shop.name}</p>
              {shop.is_main && (
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-primary/10 text-primary uppercase tracking-wide">
                  Main
                </span>
              )}
            </div>
            {shop.address && (
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[220px]">{shop.address}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge dot variant={shop.is_active ? 'success' : 'danger'}>
            {shop.is_active ? 'Open' : 'Closed'}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{created}</span>
        </div>
      </div>
      {shop.phone && (
        <div className="px-3.5 py-2 bg-card border-t border-border/60">
          <MetaRow icon={<Phone size={10} />} value={shop.phone} mono />
        </div>
      )}
    </div>
  );
}

// ── Edit business inline ──────────────────────────────────────────────────────

function EditBusinessInline({
  business,
  onSuccess,
}: {
  business:  AdminBusinessDetail;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const boundAction = updateBusinessAction.bind(null, business.id);
  const [state, dispatch, isPending] = useActionState<UpdateBusinessState, FormData>(boundAction, null);

  useEffect(() => {
    if (state && 'success' in state && state.success) { setOpen(false); onSuccess(); }
  }, [state, onSuccess]);

  const error = state && 'error' in state ? state.error : null;

  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => setOpen(true)}>
        <Edit2 size={13} /> Edit
      </Button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="relative bg-card rounded-2xl shadow-card-lg border border-border w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold text-foreground">Edit Business</p>
              <button
                onClick={() => setOpen(false)}
                className="flex items-center justify-center w-7 h-7 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <X size={15} />
              </button>
            </div>

            {error && (
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
                <p className="text-xs font-semibold text-destructive">{error}</p>
              </div>
            )}

            <form action={dispatch} className="space-y-4">
              <Input label="Business name" name="name" type="text" defaultValue={business.name} required />
              <Input label="Address" name="address" type="text" defaultValue={business.address ?? ''} placeholder="Physical address" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="Phone" name="phone" type="tel" defaultValue={business.phone ?? ''} placeholder="+971 50 000 0000" />
                <Input label="Email" name="email" type="email" defaultValue={business.email ?? ''} placeholder="biz@example.com" />
              </div>
              <div className="flex justify-end gap-2 pt-1 border-t border-border">
                <Button variant="secondary" size="sm" type="button" onClick={() => setOpen(false)}>Cancel</Button>
                <Button variant="default"   size="sm" type="submit" disabled={isPending}>
                  {isPending ? 'Saving…' : 'Save changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

// ── Toggle status inline ──────────────────────────────────────────────────────

function ToggleStatusInline({
  business,
  onSuccess,
}: {
  business:  AdminBusinessDetail;
  onSuccess: () => void;
}) {
  const [open,      setOpen]      = useState(false);
  const [isPending, start]        = useTransition();
  const [error,     setError]     = useState<string | null>(null);

  async function handleConfirm() {
    start(async () => {
      const res = await toggleBusinessStatusAction(business.id);
      if (res && 'error' in res) {
        setError(res.error);
      } else {
        setOpen(false);
        onSuccess();
      }
    });
  }

  return (
    <>
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      <Button
        variant={business.is_active ? 'destructive' : 'secondary'}
        size="sm"
        onClick={() => { setError(null); setOpen(true); }}
        disabled={isPending}
      >
        {business.is_active
          ? <><Ban size={13} /> Deactivate</>
          : <><Check size={13} /> Activate</>}
      </Button>

      <ConfirmDialog
        open={open}
        title={business.is_active ? 'Deactivate business?' : 'Activate business?'}
        description={
          business.is_active
            ? `${business.name} and all its shops will no longer be accessible by the owner.`
            : `${business.name} will be restored and accessible again.`
        }
        confirmLabel={business.is_active ? 'Deactivate' : 'Activate'}
        variant={business.is_active ? 'danger' : 'primary'}
        loading={isPending}
        onConfirm={handleConfirm}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

// ── Micro-components ──────────────────────────────────────────────────────────

function FormField({ label, required, hint, children }: {
  label:     string;
  required?: boolean;
  hint?:     string;
  children:  React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-foreground mb-1.5">
        {label}
        {required && <span className="text-destructive ms-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

function MetaRow({ icon, value, mono }: { icon: React.ReactNode; value: string; mono?: boolean }) {
  return (
    <span className={cn('flex items-center gap-1.5 text-xs text-muted-foreground', mono && 'font-mono')}>
      <span className="text-muted-foreground/60 shrink-0">{icon}</span>
      {value}
    </span>
  );
}

function StatBox({ label, value, color, bg }: {
  label: string;
  value: string;
  color: string;
  bg:    string;
}) {
  return (
    <div className={cn('rounded-lg px-3 py-2.5', bg)}>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.08em]">{label}</p>
      <p className={cn('text-sm font-bold mt-0.5', color)}>{value}</p>
    </div>
  );
}

const inputCls =
  'w-full h-9 px-3 rounded-md border border-input bg-background text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1 transition-colors';
