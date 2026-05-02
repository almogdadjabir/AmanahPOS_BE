'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { OwnerDrawerContext } from './OwnerDrawerContext';
import Drawer from '@/components/ds/Drawer';
import Avatar from '@/components/ui/Avatar';
import Badge from '@/components/ui/Badge';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ds/ConfirmDialog';
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

// ── Shell ─────────────────────────────────────────────────────────────────────
// This component:
//   1. Holds drawer state in React (no URL changes → no page re-renders)
//   2. Provides openView/openCreate to child client components via context
//   3. Renders {children} (the server-rendered list) unchanged
//   4. Renders the drawers as overlays on top

export default function OwnersDrawerShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [viewId,      setViewId]      = useState<string | null>(null);
  const [createOpen,  setCreateOpen]  = useState(false);

  function openView(id: string)  { setViewId(id); }
  function openCreate()          { setCreateOpen(true); }
  function closeCreate()         { setCreateOpen(false); }
  function closeView()           { setViewId(null); }

  function handleCreateSuccess(id: string) {
    setCreateOpen(false);
    setViewId(id);
    router.refresh(); // silently re-fetch the list to include the new owner
  }

  function refreshList() {
    router.refresh();
  }

  return (
    <OwnerDrawerContext.Provider value={{ openView, openCreate }}>
      {children}

      {/* ── Create Owner drawer ──────────────────────────────────────────── */}
      <Drawer
        open={createOpen}
        onClose={closeCreate}
        title="Create Owner"
        subtitle="Register a new business owner account"
        width={480}
      >
        <CreateOwnerContent onSuccess={handleCreateSuccess} onClose={closeCreate} />
      </Drawer>

      {/* ── View Owner drawer ────────────────────────────────────────────── */}
      <Drawer open={!!viewId} onClose={closeView} title="Owner Details" width={560}>
        {viewId && (
          <OwnerDetailContent
            ownerId={viewId}
            onClose={closeView}
            onMutate={refreshList}
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
  const [state, dispatch, isPending] = useActionState<CreateOwnerState, FormData>(
    createOwnerAction,
    null,
  );

  useEffect(() => {
    if (state && 'success' in state && state.success) {
      onSuccess(state.owner_id);
    }
  }, [state, onSuccess]);

  const error = state && 'error' in state ? state.error : null;

  return (
    <div className="p-5">
      {error && (
        <div className="mb-4 bg-danger-light border border-danger/20 rounded-xl px-4 py-3">
          <p className="text-[13px] font-semibold text-danger">{error}</p>
        </div>
      )}

      <form action={dispatch} className="space-y-4">
        <input type="hidden" name="mode" value="drawer" />
        <input type="hidden" name="locale" value="ar" />

        <FormField label="Full name" required>
          <input
            name="full_name"
            type="text"
            placeholder="e.g. Ahmed Al-Hassan"
            required
            className={inputCls}
          />
        </FormField>

        <FormField
          label="Phone number"
          required
          hint="The owner will log in using this number via OTP."
        >
          <div className="flex gap-2">
            <select
              name="country_code"
              defaultValue="+249"
              className="h-9 px-2 rounded-lg border border-border-soft bg-white text-[13px] text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors"
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
              className={`${inputCls} flex-1`}
            />
          </div>
        </FormField>

        <FormField label="Email address" hint="Optional — used for notifications.">
          <input name="email" type="email" placeholder="owner@example.com" className={inputCls} />
        </FormField>

        <div className="bg-info-light border border-info/20 rounded-xl px-4 py-3 flex gap-3">
          <InfoIcon />
          <p className="text-[12px] text-info leading-relaxed">
            The owner account will be created without a password. They can log in via OTP on their first login.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border-soft">
          <Button variant="default" size="sm" type="button" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" size="sm" type="submit" disabled={isPending}>
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
  const [owner,      setOwner]      = useState<AdminOwnerDetail | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [errorMsg,   setErrorMsg]   = useState<string | null>(null);

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
        <div className="bg-danger-light border border-danger/20 rounded-xl px-4 py-8 text-center">
          <p className="text-[13px] font-semibold text-danger">Failed to load owner</p>
          {errorMsg && (
            <p className="text-[12px] font-mono text-danger/80 mt-1 break-all">{errorMsg}</p>
          )}
          <button onClick={load} className="mt-3 text-[12px] font-semibold text-primary hover:underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const joined = new Date(owner.created_at).toLocaleDateString('en-US', {
    month: 'long', day: 'numeric', year: 'numeric',
  });
  const lastSeen = owner.last_login_at
    ? new Date(owner.last_login_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
      })
    : null;

  function handleMutate() {
    load();       // refresh drawer content
    onMutate();   // refresh list
  }

  return (
    <div className="divide-y divide-border-soft">
      {/* ── Profile ─────────────────────────────────────────────────────── */}
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-4">
          <Avatar name={owner.full_name || owner.phone} size={52} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[17px] font-bold text-text-primary leading-tight">
                {owner.full_name || (
                  <span className="text-text-hint italic text-[14px] font-normal">No name set</span>
                )}
              </p>
              <Badge dot variant={owner.is_active ? 'success' : 'danger'}>
                {owner.is_active ? 'Active' : 'Inactive'}
              </Badge>
              {owner.is_verified && <Badge variant="info">Verified</Badge>}
            </div>

            <div className="mt-2.5 flex flex-col gap-1.5">
              <MetaRow icon={<PhoneIcon />} value={owner.phone} mono />
              {owner.email    && <MetaRow icon={<MailIcon />}     value={owner.email} />}
              <MetaRow icon={<CalendarIcon />} value={`Joined ${joined}`} />
              {lastSeen && <MetaRow icon={<ClockIcon />} value={`Last seen ${lastSeen}`} />}
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-4 gap-3 pt-3 border-t border-border-soft">
          <StatCell label="Businesses" value={String(owner.business_count)}  color="text-primary" />
          <StatCell
            label="Plan"
            value={owner.has_active_subscription ? 'Active' : 'No plan'}
            color={owner.has_active_subscription ? 'text-success' : 'text-warning'}
          />
          <StatCell
            label="Verified"
            value={owner.is_verified ? 'Yes' : 'No'}
            color={owner.is_verified ? 'text-success' : 'text-text-hint'}
          />
          <StatCell
            label="Password"
            value={owner.has_password ? 'Set' : 'OTP only'}
            color={owner.has_password ? 'text-text-primary' : 'text-text-hint'}
          />
        </div>

        {/* Action row */}
        <div className="flex items-center gap-2 flex-wrap">
          <EditOwnerInline owner={owner} onSuccess={handleMutate} />
          <ToggleStatusInline owner={owner} onSuccess={handleMutate} />
        </div>
      </div>

      {/* ── Businesses ──────────────────────────────────────────────────── */}
      <div className="p-5">
        <p className="text-[12px] font-semibold text-text-primary mb-3">
          Businesses
          <span className="ml-1.5 text-[11px] font-normal text-text-hint">({owner.business_count})</span>
        </p>
        {owner.businesses.length === 0 ? (
          <p className="text-[12px] text-text-hint italic">No businesses created yet.</p>
        ) : (
          <div className="space-y-3">
            {owner.businesses.map(biz => <BizCard key={biz.id} biz={biz} />)}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function DetailSkeleton() {
  return (
    <div className="p-5 space-y-4 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-13 h-13 rounded-full bg-surface-soft shrink-0" style={{ width: 52, height: 52 }} />
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-surface-soft rounded w-40" />
          <div className="h-3 bg-surface-soft rounded w-28" />
          <div className="h-3 bg-surface-soft rounded w-48" />
        </div>
      </div>
      <div className="grid grid-cols-4 gap-3 pt-3 border-t border-border-soft">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-1.5">
            <div className="h-2 bg-surface-soft rounded w-12" />
            <div className="h-4 bg-surface-soft rounded w-10" />
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <div className="h-7 bg-surface-soft rounded-md w-16" />
        <div className="h-7 bg-surface-soft rounded-md w-24" />
      </div>
      <div className="pt-2 border-t border-border-soft space-y-3">
        {[...Array(2)].map((_, i) => (
          <div key={i} className="h-20 bg-surface-soft rounded-xl" />
        ))}
      </div>
    </div>
  );
}

// ── Edit owner inline ─────────────────────────────────────────────────────────

function EditOwnerInline({
  owner,
  onSuccess,
}: {
  owner: AdminOwnerDetail;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);
  const boundAction = updateOwnerAction.bind(null, owner.id);
  const [state, dispatch, isPending] = useActionState<UpdateOwnerState, FormData>(boundAction, null);

  useEffect(() => {
    if (state && 'success' in state && state.success) {
      setOpen(false);
      onSuccess();
    }
  }, [state, onSuccess]);

  const error = state && 'error' in state ? state.error : null;

  return (
    <>
      <Button variant="default" size="sm" onClick={() => setOpen(true)}>
        <EditIcon /> Edit
      </Button>

      {open && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/30 backdrop-blur-[2px]"
            onClick={() => setOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold text-text-primary">Edit Owner</p>
              <button
                onClick={() => setOpen(false)}
                className="flex items-center justify-center w-7 h-7 rounded-lg text-text-hint hover:text-text-primary hover:bg-surface-soft transition-colors"
              >
                <XIcon />
              </button>
            </div>

            {error && (
              <div className="bg-danger-light border border-danger/20 rounded-lg px-3 py-2">
                <p className="text-[12px] font-semibold text-danger">{error}</p>
              </div>
            )}

            <form action={dispatch} className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">
                  Full name <span className="text-danger">*</span>
                </label>
                <input
                  name="full_name"
                  type="text"
                  defaultValue={owner.full_name}
                  required
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">
                  Email address
                </label>
                <input
                  name="email"
                  type="email"
                  defaultValue={owner.email ?? ''}
                  placeholder="owner@example.com"
                  className={inputCls}
                />
              </div>
              <div className="flex justify-end gap-2 pt-1 border-t border-border-soft">
                <Button variant="default" size="sm" type="button" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" disabled={isPending}>
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
  owner,
  onSuccess,
}: {
  owner: AdminOwnerDetail;
  onSuccess: () => void;
}) {
  const [open, setOpen]       = useState(false);
  const [isPending, start]    = useTransition();
  const [error, setError]     = useState<string | null>(null);

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
      {error && <p className="text-[11px] text-danger">{error}</p>}
      <Button
        variant={owner.is_active ? 'danger' : 'default'}
        size="sm"
        onClick={() => { setError(null); setOpen(true); }}
        disabled={isPending}
      >
        {owner.is_active ? <><BanIcon /> Deactivate</> : <><CheckIcon /> Activate</>}
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
    <div className="rounded-xl border border-border-soft overflow-hidden">
      {/* Header */}
      <div className="px-3.5 py-3 flex items-start justify-between gap-3 bg-surface-soft/50">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-primary-soft flex items-center justify-center shrink-0">
            <span className="text-[12px] font-black text-primary uppercase">{biz.name.charAt(0)}</span>
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-text-primary truncate">{biz.name}</p>
            <p className="text-[11px] font-mono text-text-hint mt-0.5">{biz.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge dot variant={biz.is_active ? 'success' : 'danger'}>
            {biz.is_active ? 'Active' : 'Inactive'}
          </Badge>
          <span className="text-[11px] text-text-hint">{created}</span>
        </div>
      </div>

      {/* Stats row */}
      <div className="px-3.5 py-2.5 flex items-center gap-5 bg-white border-t border-border-soft">
        <div>
          <p className="text-[10px] font-semibold text-text-hint uppercase tracking-wide mb-0.5">Subscription</p>
          {biz.active_subscription ? (
            <div className="flex items-center gap-1.5">
              <Badge dot variant="success">{biz.active_subscription.plan_name}</Badge>
              <span className={`text-[11px] font-semibold ${biz.active_subscription.days_remaining <= 7 ? 'text-warning' : 'text-success'}`}>
                {biz.active_subscription.days_remaining}d left
              </span>
            </div>
          ) : (
            <Badge dot variant="warning">No plan</Badge>
          )}
        </div>
        <div>
          <p className="text-[10px] font-semibold text-text-hint uppercase tracking-wide mb-0.5">Active shops</p>
          <p className="text-[13px] font-bold text-text-primary">{biz.shop_count}</p>
        </div>
      </div>

      {/* Shops list */}
      {biz.shops.length > 0 && (
        <div className="border-t border-border-soft">
          <div className="px-3.5 py-1.5 bg-surface-soft/50">
            <p className="text-[10px] font-semibold text-text-hint uppercase tracking-wider">
              Shops ({biz.shops.length})
            </p>
          </div>
          <div className="divide-y divide-border-soft">
            {biz.shops.map(shop => (
              <div key={shop.id} className="px-3.5 py-2.5 flex items-center justify-between bg-white">
                <div>
                  <p className="text-[12px] font-semibold text-text-primary">{shop.name}</p>
                  {shop.address && (
                    <p className="text-[11px] text-text-hint mt-0.5 truncate max-w-[220px]">{shop.address}</p>
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

function FormField({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-text-secondary mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-text-hint mt-1">{hint}</p>}
    </div>
  );
}

function MetaRow({ icon, value, mono }: { icon: React.ReactNode; value: string; mono?: boolean }) {
  return (
    <span className={`flex items-center gap-1.5 text-[12px] text-text-secondary ${mono ? 'font-mono' : ''}`}>
      <span className="text-text-hint shrink-0">{icon}</span>
      {value}
    </span>
  );
}

function StatCell({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-text-hint uppercase tracking-wide">{label}</p>
      <p className={`text-[14px] font-bold mt-0.5 ${color}`}>{value}</p>
    </div>
  );
}

const inputCls =
  'w-full h-9 px-3 rounded-lg border border-border-soft bg-white text-[13px] text-text-primary placeholder:text-text-hint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors';

// ── Icons ─────────────────────────────────────────────────────────────────────
function PhoneIcon()    { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 10a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 1.2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.84a16 16 0 0 0 6.29 6.29l.95-.88a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>; }
function MailIcon()     { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>; }
function CalendarIcon() { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
function ClockIcon()    { return <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>; }
function EditIcon()     { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function BanIcon()      { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>; }
function CheckIcon()    { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
function XIcon()        { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>; }
function InfoIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0EA5E9" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 mt-0.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }
