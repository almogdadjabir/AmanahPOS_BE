'use client';

import { useState, useTransition, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { StaffDrawerContext } from './StaffDrawerContext';
import Drawer from '@/components/ds/Drawer';
import ConfirmDialog from '@/components/ds/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import PhoneInput from '@/components/ui/PhoneInput';
import {
  createStaffAction, updateStaffAction, toggleStaffStatusAction,
  type StaffActionState,
} from '@/actions/staff';
import type { Shop, StaffUser } from '@/types/api';

export default function StaffDrawerShell({ children, shops = [] }: { children: React.ReactNode; shops?: Shop[] }) {
  const router = useRouter();
  const [addOpen,        setAddOpen]        = useState(false);
  const [editUser,       setEditUser]       = useState<StaffUser | null>(null);
  const [deactivateUser, setDeactivateUser] = useState<StaffUser | null>(null);
  const [toggling,       startToggle]       = useTransition();

  function handleSuccess() {
    setAddOpen(false);
    setEditUser(null);
    router.refresh();
  }

  async function handleToggle() {
    if (!deactivateUser) return;
    const activate = !deactivateUser.is_active;
    startToggle(async () => {
      await toggleStaffStatusAction(deactivateUser.id, activate);
      setDeactivateUser(null);
      router.refresh();
    });
  }

  const deactivating = deactivateUser ? !deactivateUser.is_active : false;

  return (
    <StaffDrawerContext.Provider value={{
      openAdd:        ()     => setAddOpen(true),
      openEdit:       (user) => setEditUser(user),
      openDeactivate: (user) => setDeactivateUser(user),
    }}>
      {children}

      {/* Add drawer */}
      <Drawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Staff Member"
        subtitle="Create a new manager or cashier account."
      >
        <AddStaffForm shops={shops} onClose={() => setAddOpen(false)} onSuccess={handleSuccess} />
      </Drawer>

      {/* Edit drawer */}
      <Drawer
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title="Edit Staff Member"
        subtitle="Update name, role, or shop assignment."
      >
        {editUser && (
          <EditStaffForm
            user={editUser}
            shops={shops}
            onClose={() => setEditUser(null)}
            onSuccess={handleSuccess}
          />
        )}
      </Drawer>

      {/* Deactivate / Activate confirm */}
      <ConfirmDialog
        open={!!deactivateUser}
        title={deactivating ? 'Activate Staff Member' : 'Deactivate Staff Member'}
        description={
          deactivating
            ? `Activate ${deactivateUser?.full_name || deactivateUser?.phone}? They will be able to sign in again.`
            : `Deactivate ${deactivateUser?.full_name || deactivateUser?.phone}? They won't be able to sign in until reactivated.`
        }
        confirmLabel={deactivating ? 'Activate' : 'Deactivate'}
        variant={deactivating ? 'primary' : 'danger'}
        loading={toggling}
        onConfirm={handleToggle}
        onClose={() => setDeactivateUser(null)}
      />
    </StaffDrawerContext.Provider>
  );
}

// ── Add Staff Form ────────────────────────────────────────────────────────────

function AddStaffForm({
  shops = [],
  onClose,
  onSuccess,
}: {
  shops?:     Shop[];
  onClose:    () => void;
  onSuccess:  () => void;
}) {
  const [state, dispatch, isPending] = useActionState<StaffActionState, FormData>(
    createStaffAction,
    null,
  );

  useEffect(() => {
    if (state && 'success' in state) onSuccess();
  }, [state, onSuccess]);

  const error = state && 'error' in state ? state.error : null;
  return (
    <form action={dispatch} className="p-5 space-y-4">
      {error && <InlineError message={error} />}

      <Input
        label="Full name"
        name="full_name"
        required
        placeholder="e.g. Ahmed Mohamed"
        autoFocus
      />
      <PhoneInput label="Phone number" required />

      <div className="space-y-1.5">
        <p className="text-[12.5px] font-semibold text-foreground">Role</p>
        <RoleSelector />
      </div>

      {shops.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[12.5px] font-semibold text-foreground">Assigned shop</p>
          <p className="text-[11px] text-muted-foreground">
            Cashiers can only sell and see products for their assigned shop.
          </p>
          <ShopPicker shops={shops.filter(s => s.is_active)} defaultValue="" />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button size="sm" type="submit" disabled={isPending}>
          {isPending ? 'Adding…' : 'Add staff member'}
        </Button>
        <Button size="sm" variant="secondary" type="button" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ── Edit Staff Form ───────────────────────────────────────────────────────────

function EditStaffForm({
  user,
  shops,
  onClose,
  onSuccess,
}: {
  user:      StaffUser;
  shops:     Shop[];
  onClose:   () => void;
  onSuccess: () => void;
}) {
  const boundAction = updateStaffAction.bind(null, user.id);
  const [state, dispatch, isPending] = useActionState<StaffActionState, FormData>(
    boundAction,
    null,
  );

  useEffect(() => {
    if (state && 'success' in state) onSuccess();
  }, [state, onSuccess]);

  const error = state && 'error' in state ? state.error : null;
  // Show all shops in the picker, not just active, so an existing inactive
  // assignment is visible and the owner can re-assign or clear it.
  const pickerShops = shops.length > 0
    ? shops
    : [];

  return (
    <form action={dispatch} className="p-5 space-y-4">
      {error && <InlineError message={error} />}

      <Input
        label="Full name"
        name="full_name"
        required
        defaultValue={user.full_name}
        placeholder="e.g. Ahmed Mohamed"
      />

      <div>
        <p className="text-[11px] font-medium text-muted-foreground mb-1">Phone</p>
        <p className="text-[13px] font-semibold text-foreground bg-muted/50 rounded-lg px-3 py-2.5 border border-border/60">
          {user.phone}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">Phone number cannot be changed.</p>
      </div>

      <div className="space-y-1.5">
        <p className="text-[12.5px] font-semibold text-foreground">Role</p>
        <RoleSelector defaultValue={user.role === 'owner' ? 'manager' : user.role} />
      </div>

      {pickerShops.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[12.5px] font-semibold text-foreground">Assigned shop</p>
          <p className="text-[11px] text-muted-foreground">
            Cashiers can only sell and see products for their assigned shop.
          </p>
          <ShopPicker shops={pickerShops} defaultValue={user.default_shop_id ?? ''} />
        </div>
      )}

      <div className="flex gap-2 pt-2">
        <Button size="sm" type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : 'Save changes'}
        </Button>
        <Button size="sm" variant="secondary" type="button" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ── Role Selector ─────────────────────────────────────────────────────────────

function RoleSelector({ defaultValue = 'cashier' }: { defaultValue?: string }) {
  const [selected, setSelected] = useState(defaultValue);
  const roles = [
    { value: 'manager', label: 'Manager', desc: 'Full access, can manage staff' },
    { value: 'cashier', label: 'Cashier', desc: 'POS & sales only' },
  ] as const;

  return (
    <div className="grid grid-cols-2 gap-2">
      <input type="hidden" name="role" value={selected} />
      {roles.map(r => (
        <button
          key={r.value}
          type="button"
          onClick={() => setSelected(r.value)}
          className={`text-start rounded-xl border px-3 py-2.5 transition-all ${
            selected === r.value
              ? 'border-primary bg-primary/5 shadow-[0_0_0_1px] shadow-primary/30'
              : 'border-border hover:border-border/80 hover:bg-muted/40'
          }`}
        >
          <p className={`text-[12.5px] font-bold ${selected === r.value ? 'text-primary' : 'text-foreground'}`}>
            {r.label}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{r.desc}</p>
        </button>
      ))}
    </div>
  );
}

// ── Shop Picker ───────────────────────────────────────────────────────────────

function ShopPicker({ shops, defaultValue }: { shops: Shop[]; defaultValue: string }) {
  const [selected, setSelected] = useState(defaultValue);

  return (
    <div className="space-y-1.5">
      <input type="hidden" name="default_shop_id" value={selected} />
      <div className="grid gap-1.5">
        <button
          key=""
          type="button"
          onClick={() => setSelected('')}
          className={[
            'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-start transition-all',
            selected === ''
              ? 'border-border bg-muted/40 opacity-60'
              : 'border-border hover:border-border/80 hover:bg-muted/20',
          ].join(' ')}
        >
          <span className="w-4 h-4 rounded-full border-2 border-border flex items-center justify-center shrink-0">
            {selected === '' && <span className="w-2 h-2 rounded-full bg-muted-foreground" />}
          </span>
          <span className="text-[12.5px] text-muted-foreground font-medium">No shop assigned</span>
        </button>

        {shops.map(shop => (
          <button
            key={shop.id}
            type="button"
            onClick={() => setSelected(shop.id)}
            className={[
              'flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-start transition-all',
              selected === shop.id
                ? 'border-primary bg-primary/5 shadow-[0_0_0_1px] shadow-primary/30'
                : 'border-border hover:border-border/80 hover:bg-muted/20',
            ].join(' ')}
          >
            <span className={[
              'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
              selected === shop.id ? 'border-primary' : 'border-border',
            ].join(' ')}>
              {selected === shop.id && <span className="w-2 h-2 rounded-full bg-primary" />}
            </span>
            <span className={[
              'text-[12.5px] font-semibold',
              selected === shop.id ? 'text-primary' : 'text-foreground',
            ].join(' ')}>
              {shop.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-3">
      <AlertCircle size={13} className="text-destructive shrink-0 mt-0.5" />
      <p className="text-[12px] font-semibold text-destructive leading-relaxed">{message}</p>
    </div>
  );
}
