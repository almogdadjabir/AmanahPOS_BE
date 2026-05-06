'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlanDrawerContext } from './PlanDrawerContext';
import Drawer from '@/components/ds/Drawer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ds/ConfirmDialog';
import { Skeleton } from '@/components/ui/skeleton';
import FeaturesEditor from './FeaturesEditor';
import {
  createPlanAction,
  fetchPlanDetailAction,
  updatePlanAction,
  togglePlanActiveAction,
  type CreatePlanState,
  type UpdatePlanState,
  type PlanDetailResult,
} from '@/actions/plans';
import type { AdminPlan } from '@/types/api';
import { cn } from '@/lib/utils';
import {
  Package, Edit2, ToggleLeft, ToggleRight, Info,
  Store, ShoppingBag, Users, Clock, Hash, Calendar,
  DollarSign,
} from 'lucide-react';

export default function PlansDrawerShell({ children }: { children: React.ReactNode }) {
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
    <PlanDrawerContext.Provider value={{ openView, openCreate }}>
      {children}

      <Drawer
        open={createOpen}
        onClose={closeCreate}
        title="New Plan"
        subtitle="Create a paid subscription plan"
        width={480}
      >
        <CreatePlanContent onSuccess={handleCreateSuccess} onClose={closeCreate} />
      </Drawer>

      <Drawer open={!!viewId} onClose={closeView} title="Plan Details" width={560}>
        {viewId && (
          <PlanDetailContent
            planId={viewId}
            onClose={closeView}
            onMutate={() => { router.refresh(); }}
          />
        )}
      </Drawer>
    </PlanDrawerContext.Provider>
  );
}

// ── Create Plan ───────────────────────────────────────────────────────────────

function CreatePlanContent({
  onSuccess,
  onClose,
}: {
  onSuccess: (id: string) => void;
  onClose:   () => void;
}) {
  const [state, dispatch, isPending] = useActionState<CreatePlanState, FormData>(
    createPlanAction, null,
  );

  useEffect(() => {
    if (state && 'success' in state && state.success) onSuccess(state.plan_id);
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
        <FormField label="Plan name" required>
          <input
            name="name"
            type="text"
            placeholder="e.g. Starter, Professional, Enterprise"
            required
            className={inputCls}
          />
        </FormField>

        <FormField label="Description" hint="Shown to owners when selecting a plan.">
          <textarea
            name="description"
            rows={2}
            placeholder="Brief description of what's included…"
            className={cn(inputCls, 'resize-none')}
          />
        </FormField>

        <div className="grid grid-cols-2 gap-3">
          <FormField label="Price" required hint="Amount in the selected currency.">
            <input
              name="price"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="0.00"
              required
              className={inputCls}
            />
          </FormField>

          <FormField label="Currency">
            <select name="currency" defaultValue="SDG" className={inputCls}>
              <option value="SDG">SDG — Sudanese Pound</option>
            </select>
          </FormField>
        </div>

        <FormField label="Duration (days)" hint="How many days the plan grants access for.">
          <input
            name="duration_days"
            type="number"
            min="1"
            placeholder="e.g. 30, 90, 365"
            className={inputCls}
          />
        </FormField>

        <div className="grid grid-cols-3 gap-3">
          <FormField label="Max shops">
            <input name="max_shops"    type="number" min="0" placeholder="0" className={inputCls} />
          </FormField>
          <FormField label="Max products">
            <input name="max_products" type="number" min="0" placeholder="0" className={inputCls} />
          </FormField>
          <FormField label="Max users">
            <input name="max_users"    type="number" min="0" placeholder="0" className={inputCls} />
          </FormField>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-semibold text-foreground">Features</label>
          <FeaturesEditor name="features" />
        </div>

        <FormField label="Sort order" hint="Lower numbers appear first.">
          <input name="sort_order" type="number" min="0" placeholder="0" className={inputCls} />
        </FormField>

        <div className="flex items-start gap-3 rounded-lg border border-success/20 bg-success/5 px-4 py-3">
          <Info size={15} className="shrink-0 mt-0.5 text-success" />
          <p className="text-xs text-success/80 leading-relaxed">
            All plans created here are <strong>paid plans</strong>. Demo access is managed separately
            and cannot be created from this interface.
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="secondary" size="sm" type="button" onClick={onClose}>Cancel</Button>
          <Button variant="default" size="sm" type="submit" disabled={isPending}>
            {isPending ? 'Creating…' : 'Create Plan'}
          </Button>
        </div>
      </form>
    </div>
  );
}

// ── Plan Detail ───────────────────────────────────────────────────────────────

function PlanDetailContent({
  planId,
  onClose: _onClose,
  onMutate,
}: {
  planId:   string;
  onClose:  () => void;
  onMutate: () => void;
}) {
  const [plan,     setPlan]    = useState<AdminPlan | null>(null);
  const [loading,  setLoading] = useState(true);
  const [errorMsg, setError]   = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    const result: PlanDetailResult = await fetchPlanDetailAction(planId);
    if (result.ok) setPlan(result.data);
    else           setError(result.error);
    setLoading(false);
  }

  useEffect(() => { load(); }, [planId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) return <DetailSkeleton />;

  if (errorMsg || !plan) {
    return (
      <div className="p-5">
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-destructive">Failed to load plan</p>
          {errorMsg && <p className="text-xs font-mono text-destructive/80 mt-1 break-all">{errorMsg}</p>}
          <button onClick={load} className="mt-3 text-xs font-semibold text-primary hover:underline">
            Retry
          </button>
        </div>
      </div>
    );
  }

  const created = new Date(plan.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  const updated = new Date(plan.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  function handleMutate() { load(); onMutate(); }

  return (
    <div>
      {/* ── Banner ──────────────────────────────────────────────────────────── */}
      <div className="relative">
        <div className={cn(
          'h-[72px] bg-gradient-to-br',
          plan.is_active
            ? 'from-success/20 via-success/5 to-transparent'
            : 'from-muted/60 via-muted/20 to-transparent',
        )} />

        <div className="px-5 -mt-9 flex items-end gap-4 pb-4 border-b border-border">
          <div className="shrink-0">
            <div className={cn(
              'rounded-xl ring-4 ring-card overflow-hidden w-16 h-16 flex items-center justify-center',
              plan.is_active ? 'bg-success/10' : 'bg-muted',
            )}>
              <Package size={28} className={plan.is_active ? 'text-success' : 'text-muted-foreground'} />
            </div>
          </div>

          <div className="min-w-0 flex-1 pb-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-[17px] font-bold text-foreground leading-tight truncate">
                {plan.name}
              </p>
              <Badge dot variant={plan.is_active ? 'success' : 'warning'}>
                {plan.is_active ? 'Active' : 'Inactive'}
              </Badge>
              {plan.is_free && <Badge variant="info">Demo</Badge>}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              {plan.subscription_count} active subscription{plan.subscription_count !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
      </div>

      {/* ── Meta ────────────────────────────────────────────────────────────── */}
      <div className="px-5 py-3 border-b border-border/60 bg-muted/20 space-y-1">
        <MetaRow icon={<DollarSign size={10} />} label="Price"    value={`${parseFloat(plan.price).toFixed(2)} ${plan.currency}`} />
        <MetaRow icon={<Clock      size={10} />} label="Duration" value={`${plan.duration_days} days`} />
        <MetaRow icon={<Hash       size={10} />} label="Order"    value={`${plan.sort_order}`} />
        <MetaRow icon={<Calendar   size={10} />} label="Created"  value={created} />
        <MetaRow icon={<Calendar   size={10} />} label="Updated"  value={updated} />
        {plan.description && (
          <MetaRow icon={<Info size={10} />} label="Notes" value={plan.description} />
        )}
      </div>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-border">
        <div className="grid grid-cols-3 gap-2">
          <StatBox label="Subscriptions" value={`${plan.subscription_count}`} color="text-success"  bg="bg-success/10" />
          <StatBox label="Max Shops"     value={`${plan.max_shops}`}          color="text-info"     bg="bg-info/10" />
          <StatBox label="Max Users"     value={`${plan.max_users}`}          color="text-primary"  bg="bg-primary/10" />
        </div>
      </div>

      {/* ── Limits ──────────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 border-b border-border">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em] mb-3">
          Plan Limits
        </p>
        <div className="grid grid-cols-3 gap-3">
          <LimitItem icon={<Store        size={13} />} label="Shops"    value={plan.max_shops} />
          <LimitItem icon={<ShoppingBag  size={13} />} label="Products" value={plan.max_products} />
          <LimitItem icon={<Users        size={13} />} label="Users"    value={plan.max_users} />
        </div>
        {Object.keys(plan.features).length > 0 && (
          <div className="mt-3 rounded-lg border border-border bg-muted/20 px-3 py-2">
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.07em] mb-1">Features</p>
            <pre className="text-[11px] font-mono text-foreground overflow-x-auto">
              {JSON.stringify(plan.features, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* ── Actions ─────────────────────────────────────────────────────────── */}
      <div className="px-5 py-4 space-y-2">
        <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-[0.08em] mb-3">
          Actions
        </p>

        <EditPlanInline plan={plan} onSuccess={handleMutate} />
        <TogglePlanInline plan={plan} onSuccess={handleMutate} />
      </div>
    </div>
  );
}

// ── Edit Plan ─────────────────────────────────────────────────────────────────

function EditPlanInline({
  plan,
  onSuccess,
}: {
  plan:      AdminPlan;
  onSuccess: () => void;
}) {
  const [open, setOpen] = useState(false);

  const action = updatePlanAction.bind(null, plan.id);
  const [state, dispatch, isPending] = useActionState<UpdatePlanState, FormData>(action, null);

  useEffect(() => {
    if (state && 'success' in state && state.success) {
      setOpen(false);
      onSuccess();
    }
  }, [state, onSuccess]);

  const error = state && 'error' in state ? state.error : null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 rounded-xl border border-border bg-card hover:bg-muted/40 px-4 py-3 transition-colors text-left"
      >
        <span className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center shrink-0">
          <Edit2 size={13} className="text-success" />
        </span>
        <div>
          <p className="text-[13px] font-semibold text-foreground">Edit Plan</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Update name, price, limits, and features</p>
        </div>
      </button>

      {open && (
        <div className="rounded-xl border border-border bg-muted/20 p-4 mt-1">
          {error && (
            <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
              <p className="text-xs font-semibold text-destructive">{error}</p>
            </div>
          )}
          <form action={dispatch} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Plan name <span className="text-destructive">*</span></label>
              <input name="name" type="text" defaultValue={plan.name} required className={inputCls} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Description</label>
              <textarea name="description" rows={2} defaultValue={plan.description} className={cn(inputCls, 'resize-none')} />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Price <span className="text-destructive">*</span></label>
                <input name="price" type="number" min="0.01" step="0.01" defaultValue={plan.price} required className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Currency</label>
                <select name="currency" defaultValue={plan.currency} className={inputCls}>
                  <option value="SDG">SDG — Sudanese Pound</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Duration (days)</label>
              <input name="duration_days" type="number" min="1" defaultValue={plan.duration_days} className={inputCls} />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Max shops</label>
                <input name="max_shops"    type="number" min="0" defaultValue={plan.max_shops}    className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Max products</label>
                <input name="max_products" type="number" min="0" defaultValue={plan.max_products} className={inputCls} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Max users</label>
                <input name="max_users"    type="number" min="0" defaultValue={plan.max_users}    className={inputCls} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-semibold text-foreground">Features</label>
              <FeaturesEditor name="features" defaultValue={plan.features} />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Sort order</label>
              <input name="sort_order" type="number" min="0" defaultValue={plan.sort_order} className={inputCls} />
            </div>

            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setOpen(false)} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5">
                Cancel
              </button>
              <Button size="sm" type="submit" disabled={isPending}>
                {isPending ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

// ── Toggle Active ─────────────────────────────────────────────────────────────

function TogglePlanInline({
  plan,
  onSuccess,
}: {
  plan:      AdminPlan;
  onSuccess: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending,   setIsPending]   = useState(false);
  const [error,       setError]       = useState<string | null>(null);

  async function handleConfirm() {
    setIsPending(true);
    const result = await togglePlanActiveAction(plan.id);
    setIsPending(false);
    if (!result || 'error' in result) { setError((result as { error: string } | null)?.error ?? 'Unknown error'); return; }
    setConfirmOpen(false);
    onSuccess();
  }

  const isActivating = !plan.is_active;

  return (
    <>
      {error && (
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2">
          <p className="text-xs font-semibold text-destructive">{error}</p>
        </div>
      )}

      <button
        type="button"
        onClick={() => setConfirmOpen(true)}
        className={cn(
          'w-full flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors text-left',
          isActivating
            ? 'border-success/20 bg-success/5 hover:bg-success/10'
            : 'border-warning/20 bg-warning/5 hover:bg-warning/10',
        )}
      >
        <span className={cn(
          'w-8 h-8 rounded-lg flex items-center justify-center shrink-0',
          isActivating ? 'bg-success/10' : 'bg-warning/10',
        )}>
          {isActivating
            ? <ToggleRight size={15} className="text-success" />
            : <ToggleLeft  size={15} className="text-warning" />
          }
        </span>
        <div>
          <p className={cn('text-[13px] font-semibold', isActivating ? 'text-success' : 'text-warning')}>
            {isActivating ? 'Activate Plan' : 'Deactivate Plan'}
          </p>
          <p className={cn('text-[11px] mt-0.5', isActivating ? 'text-success/60' : 'text-warning/60')}>
            {isActivating
              ? 'Make this plan available for new subscriptions'
              : 'Hide this plan from new subscription assignments'
            }
          </p>
        </div>
      </button>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleConfirm}
        title={isActivating ? 'Activate Plan' : 'Deactivate Plan'}
        description={
          isActivating
            ? 'This plan will become available when assigning new subscriptions.'
            : `This plan will be hidden from new subscription assignments. Existing subscriptions using "${plan.name}" will not be affected.`
        }
        confirmLabel={isPending ? 'Saving…' : isActivating ? 'Activate' : 'Deactivate'}
        variant={isActivating ? 'primary' : 'danger'}
      />
    </>
  );
}

// ── Shared micro-components ───────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-success/30 focus:border-success transition-colors';

function FormField({
  label, required, hint, children,
}: {
  label:     string;
  required?: boolean;
  hint?:     string;
  children:  React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <label className="block text-xs font-semibold text-foreground">
        {label}{required && <span className="text-destructive ml-0.5">*</span>}
      </label>
      {children}
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function MetaRow({
  icon, label, value, mono,
}: {
  icon:  React.ReactNode;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-center gap-2 py-0.5">
      <span className="w-4 h-4 flex items-center justify-center text-muted-foreground/60 shrink-0">
        {icon}
      </span>
      <span className="text-[11px] font-semibold text-muted-foreground w-14 shrink-0">{label}</span>
      <span className={cn('text-[12px] text-foreground truncate', mono && 'font-mono')}>
        {value}
      </span>
    </div>
  );
}

function StatBox({
  label, value, color, bg,
}: {
  label: string; value: string; color: string; bg: string;
}) {
  return (
    <div className={cn('rounded-xl p-3 flex flex-col items-center gap-1', bg)}>
      <p className={cn('text-[22px] font-black leading-none tabular-nums', color)}>{value}</p>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-[0.07em] text-center">{label}</p>
    </div>
  );
}

function LimitItem({
  icon, label, value,
}: {
  icon:  React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2">
      <span className="text-muted-foreground">{icon}</span>
      <div className="min-w-0">
        <p className="text-[11px] text-muted-foreground">{label}</p>
        <p className="text-[13px] font-bold text-foreground">{value}</p>
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div>
      <div className="h-[72px] bg-gradient-to-r from-muted/60 to-muted/20" />
      <div className="px-5 -mt-9 flex items-end gap-4 pb-4 border-b border-border">
        <Skeleton className="w-16 h-16 rounded-xl" />
        <div className="flex-1 space-y-2 pb-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
      <div className="px-5 py-3 border-b border-border space-y-2">
        {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-4 w-full" />)}
      </div>
      <div className="px-5 py-4 border-b border-border">
        <div className="grid grid-cols-3 gap-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
        </div>
      </div>
    </div>
  );
}
