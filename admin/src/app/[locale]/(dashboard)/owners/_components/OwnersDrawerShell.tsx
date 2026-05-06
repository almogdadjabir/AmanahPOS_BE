'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { OwnerDrawerContext } from './OwnerDrawerContext';
import Drawer from '@/components/ds/Drawer';
import Avatar from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import ConfirmDialog from '@/components/ds/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import {
  createOwnerAction,
  fetchOwnerDetailAction,
  toggleOwnerStatusAction,
  updateOwnerAction,
  type CreateOwnerState,
  type UpdateOwnerState,
  type OwnerDetailResult,
} from '@/actions/owners';
import type { AdminOwnerDetail, AdminOwnerBusiness } from '@/types/api';
import { cn } from '@/lib/utils';
import {
  Phone, Mail, Calendar, Clock, Edit2, Ban, Check, X, Info,
  Store, ShoppingBag,
} from 'lucide-react';

export default function OwnersDrawerShell({ children }: { children: React.ReactNode }) {
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
    <OwnerDrawerContext.Provider value={{ openView, openCreate }}>
      {children}

      <Drawer
        open={createOpen}
        onClose={closeCreate}
        title="Create Owner"
        subtitle="Register a new business owner account"
        width={480}
      >
        <CreateOwnerContent onSuccess={handleCreateSuccess} onClose={closeCreate} />
      </Drawer>

      <Drawer open={!!viewId} onClose={closeView} title="Owner Details" width={560}>
        {viewId && (
          <OwnerDetailContent
            ownerId={viewId}
            onClose={closeView}
            onMutate={() => { router.refresh(); }}
          />
        )}
      </Drawer>
    </OwnerDrawerContext.Provider>
  );
}

// ── Create Owner ──────────────────────────────────────────────────────────────

const COUNTRY_CODES = [
  { code: '+249', label: 'SD +249' },
  { code: '+971', label: 'AE +971' },
  { code: '+966', label: 'SA +966' },
  { code: '+20',  label: 'EG +20'  },
  { code: '+1',   label: 'US +1'   },
] as const;

function CreateOwnerContent({
  onSuccess,
  onClose,
}: {
  onSuccess: (id: string) => void;
  onClose: () => void;
}) {
  const [state, dispatch, isPending] = useActionState<CreateOwnerState, FormData>(createOwnerAction, null);

  useEffect(() => {
    if (state && 'success' in state && state.success) onSuccess(state.owner_id);
  }, [state, onSuccess]);

  const error = state && 'error' in state ? state.error : null;

  return (
    <div className="p-5">
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 px-4 py-3">
          <p className="text-sm font-semibold text-destructive">{error}</p>
        </div>
      )}

      <form action={dispatch} className="space-y-4">
        <input type="hidden" name="mode"   value="drawer" />
        <input type="hidden" name="locale" value="ar" />

        <FormField label="Full name" required>
          <input name="full_name" type="text" placeholder="e.g. Ahmed Al-Hassan" required className={inputCls} />
        </FormField>

        <FormField label="Phone number" required hint="The owner will log in using this number via OTP.">
          <div className="flex gap-2">
            <select
              name="country_code"
              defaultValue="+249"
              className={cn(inputCls, 'w-auto px-2')}
            >
              {COUNTRY_CODES.map(c => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <input
              name="phone_local"
              type="tel"
              inputMode="numeric"
              placeholder="912345678"
              required
              pattern="[0-9]{7,15}"
              className={cn(inputCls, 'flex-1')}
            />
          </div>
        </FormField>

        <FormField label="Email address" hint="Optional — used for notifications.">
          <input name="email" type="email" placeholder="owner@example.com" className={inputCls} />
        </FormField>

        <div className="flex items-start gap-3 rounded-lg border border-info/20 bg-info/5 px-4 py-3">
          <Info size={15} className="shrink-0 mt-0.5 text-info" />
          <p className="text-xs text-info leading-relaxed">
            The owner account will be created without a password. They can log in via OTP on their first login.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="default" size="sm" type="submit" disabled={isPending}>
            {isPending ? 'Creating…' : 'Create Owner'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Owner Detail ──────────────────────────────────────────────────────────────

function OwnerDetailContent({
  ownerId,
  onClose: _onClose,
  onMutate,
}: {
  ownerId: string;
  onClose: () => void;
  onMutate: () => void;
}) {
  const [owner,    setOwner]    = useState<AdminOwnerDetail | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setErrorMsg(null);
    const result: OwnerDetailResult = await fetchOwnerDetailAction(ownerId);
    if (result.ok) {
      setOwner(result.data);
    } else {
      setErrorMsg(result.error);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, [ownerId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <DetailSkeleton />;

  if (errorMsg || !owner) {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-destructive">Failed to load owner</p>
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

  const joined   = new Date(owner.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const lastSeen = owner.last_login_at
    ? new Date(owner.last_login_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : null;

  function handleMutate() { load(); onMutate(); }

  return (
    <div>
      {/* ── Profile banner ──────────────────────────────────────────────── */}
      <div className="relative">
        {/* Gradient banner */}
        <div className="h-[72px] bg-gradient-to-br from-primary/20 via-primary/10 to-info/5" />

        {/* Avatar overlapping banner */}
        <div className="px-5 -mt-9 flex items-end gap-4 pb-4 border-b border-border">
          <div className="relative shrink-0">
            <div className="rounded-full ring-4 ring-card overflow-hidden">
              <Avatar name={owner.full_name || owner.phone} size={64} />
            </div>
            <span className={cn(
              'absolute bottom-1 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-card',
              owner.is_active ? 'bg-success' : 'bg-muted-foreground/50',
            )} />
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[17px] font-bold text-foreground leading-tight">
                {owner.full_name || (
                  <span className="text-muted-foreground italic text-sm font-normal">No name set</span>
                )}
              </p>
              <Badge dot variant={owner.is_active ? 'success' : 'danger'}>
                {owner.is_active ? 'Active' : 'Inactive'}
              </Badge>
              {owner.is_verified && <Badge variant="info">Verified</Badge>}
            </div>

            <div className="mt-2 flex flex-col gap-1">
              <MetaRow icon={<Phone size={10} />} value={owner.phone} mono />
              {owner.email && <MetaRow icon={<Mail size={10} />} value={owner.email} />}
            </div>
          </div>
        </div>
      </div>

      {/* ── Timeline meta ────────────────────────────────────────────────── */}
      <div className="px-5 py-3 flex items-center gap-5 border-b border-border/60 bg-muted/20">
        <MetaRow icon={<Calendar size={10} />} value={`Joined ${joined}`} />
        {lastSeen && <MetaRow icon={<Clock size={10} />} value={`Last seen ${lastSeen}`} />}
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-border">
        <div className="grid grid-cols-4 gap-2">
          <StatBox
            label="Businesses"
            value={String(owner.business_count)}
            color="text-primary"
            bg="bg-primary/10"
          />
          <StatBox
            label="Plan"
            value={owner.has_active_subscription ? 'Active' : 'No plan'}
            color={owner.has_active_subscription ? 'text-success' : 'text-warning'}
            bg={owner.has_active_subscription ? 'bg-success/10' : 'bg-warning/10'}
          />
          <StatBox
            label="Verified"
            value={owner.is_verified ? 'Yes' : 'No'}
            color={owner.is_verified ? 'text-success' : 'text-muted-foreground'}
            bg={owner.is_verified ? 'bg-success/10' : 'bg-muted'}
          />
          <StatBox
            label="Password"
            value={owner.has_password ? 'Set' : 'OTP only'}
            color={owner.has_password ? 'text-foreground' : 'text-muted-foreground'}
            bg="bg-muted"
          />
        </div>
      </div>

      {/* ── Actions ─────────────────────────────────────────────────────── */}
      <div className="px-5 py-3.5 border-b border-border flex items-center gap-2 flex-wrap">
        <EditOwnerInline owner={owner} onSuccess={handleMutate} />
        <ToggleStatusInline owner={owner} onSuccess={handleMutate} />
      </div>

      {/* ── Businesses ──────────────────────────────────────────────────── */}
      <div className="px-5 py-4">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center [&_svg]:size-3">
            <Store />
          </span>
          <p className="text-xs font-bold text-foreground">
            Businesses
          </p>
          <span className="text-[11px] text-muted-foreground font-normal">
            ({owner.business_count})
          </span>
        </div>
        {owner.businesses.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">No businesses created yet.</p>
        ) : (
          <div className="space-y-3">
            {owner.businesses.map(biz => <BizCard key={biz.id} biz={biz} />)}
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
        <Skeleton className="w-16 h-16 rounded-full ring-4 ring-card shrink-0" />
        <div className="flex-1 pb-1 space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-28" />
        </div>
      </div>
      <div className="px-5 py-4 border-b border-border">
        <div className="grid grid-cols-4 gap-2">
          {[...Array(4)].map((_, i) => (
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

// ── Edit owner inline ─────────────────────────────────────────────────────────

function EditOwnerInline({ owner, onSuccess }: { owner: AdminOwnerDetail; onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const boundAction = updateOwnerAction.bind(null, owner.id);
  const [state, dispatch, isPending] = useActionState<UpdateOwnerState, FormData>(boundAction, null);

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
              <p className="text-[15px] font-bold text-foreground">Edit Owner</p>
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
              <Input label="Full name" name="full_name" type="text" defaultValue={owner.full_name} required />
              <Input label="Email address" name="email" type="email" defaultValue={owner.email ?? ''} placeholder="owner@example.com" />
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

function ToggleStatusInline({ owner, onSuccess }: { owner: AdminOwnerDetail; onSuccess: () => void }) {
  const [open,  setOpen]  = useState(false);
  const [isPending, start] = useTransition();
  const [error, setError]  = useState<string | null>(null);

  async function handleConfirm() {
    start(async () => {
      const res = await toggleOwnerStatusAction(owner.id);
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
        variant={owner.is_active ? 'destructive' : 'secondary'}
        size="sm"
        onClick={() => { setError(null); setOpen(true); }}
        disabled={isPending}
      >
        {owner.is_active ? <><Ban size={13} /> Deactivate</> : <><Check size={13} /> Activate</>}
      </Button>

      <ConfirmDialog
        open={open}
        title={owner.is_active ? 'Deactivate owner?' : 'Activate owner?'}
        description={
          owner.is_active
            ? `${owner.full_name || owner.phone} will no longer be able to log in or access their account.`
            : `${owner.full_name || owner.phone} will regain full access to their account.`
        }
        confirmLabel={owner.is_active ? 'Deactivate' : 'Activate'}
        variant={owner.is_active ? 'danger' : 'primary'}
        loading={isPending}
        onConfirm={handleConfirm}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

// ── Business card ─────────────────────────────────────────────────────────────

function BizCard({ biz }: { biz: AdminOwnerBusiness }) {
  const created = new Date(biz.created_at).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      {/* Business header */}
      <div className="px-3.5 py-3 flex items-start justify-between gap-3 bg-gradient-to-r from-muted/60 to-muted/20">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
            <span className="text-[13px] font-black text-primary uppercase">{biz.name.charAt(0)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-foreground truncate">{biz.name}</p>
            <p className="text-[11px] font-mono text-muted-foreground mt-0.5">{biz.slug}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <Badge dot variant={biz.is_active ? 'success' : 'danger'}>
            {biz.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <span className="text-[10px] text-muted-foreground">{created}</span>
        </div>
      </div>

      {/* Business stats */}
      <div className="px-3.5 py-2.5 flex items-center gap-4 bg-card border-t border-border/60">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1">Subscription</p>
          {biz.active_subscription ? (
            <div className="flex items-center gap-1.5">
              <Badge dot variant="success">{biz.active_subscription.plan_name}</Badge>
              <span className={cn(
                'text-[11px] font-semibold',
                biz.active_subscription.days_remaining <= 7 ? 'text-warning' : 'text-success',
              )}>
                {biz.active_subscription.days_remaining}d left
              </span>
            </div>
          ) : (
            <Badge dot variant="warning">No plan</Badge>
          )}
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-1.5">
          <ShoppingBag className="size-3.5 text-muted-foreground/60" />
          <div>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-0.5">Shops</p>
            <p className="text-[13px] font-bold text-foreground">{biz.shop_count}</p>
          </div>
        </div>
      </div>

      {/* Shops list */}
      {biz.shops.length > 0 && (
        <div className="border-t border-border">
          <div className="px-3.5 py-1.5 bg-muted/30">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Shops ({biz.shops.length})
            </p>
          </div>
          <div className="divide-y divide-border/60">
            {biz.shops.map(shop => (
              <div key={shop.id} className="px-3.5 py-2.5 flex items-center justify-between bg-card">
                <div>
                  <p className="text-xs font-semibold text-foreground">{shop.name}</p>
                  {shop.address && (
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate max-w-[220px]">{shop.address}</p>
                  )}
                </div>
                <Badge dot variant={shop.is_active ? 'success' : 'danger'}>
                  {shop.is_active ? 'Open' : 'Closed'}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
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
