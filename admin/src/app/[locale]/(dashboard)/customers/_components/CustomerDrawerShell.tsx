'use client';

import { useState, useTransition, useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { CustomerDrawerContext } from './CustomerDrawerContext';
import Drawer from '@/components/ds/Drawer';
import ConfirmDialog from '@/components/ds/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createCustomerAction, updateCustomerAction, toggleCustomerStatusAction,
  type CustomerActionState,
} from '@/actions/customers';
import type { Customer } from '@/types/api';

export default function CustomerDrawerShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [addOpen,        setAddOpen]        = useState(false);
  const [editCustomer,   setEditCustomer]   = useState<Customer | null>(null);
  const [deactivateCust, setDeactivateCust] = useState<Customer | null>(null);
  const [toggling,       startToggle]       = useTransition();

  function handleSuccess() {
    setAddOpen(false);
    setEditCustomer(null);
    router.refresh();
  }

  async function handleToggle() {
    if (!deactivateCust) return;
    const activate = !deactivateCust.is_active;
    startToggle(async () => {
      await toggleCustomerStatusAction(deactivateCust.id, activate);
      setDeactivateCust(null);
      router.refresh();
    });
  }

  const activating = deactivateCust ? !deactivateCust.is_active : false;

  return (
    <CustomerDrawerContext.Provider value={{
      openAdd:        ()         => setAddOpen(true),
      openEdit:       (customer) => setEditCustomer(customer),
      openDeactivate: (customer) => setDeactivateCust(customer),
    }}>
      {children}

      {/* Add drawer */}
      <Drawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Customer"
        subtitle="Create a new customer profile."
      >
        <AddCustomerForm onClose={() => setAddOpen(false)} onSuccess={handleSuccess} />
      </Drawer>

      {/* Edit drawer */}
      <Drawer
        open={!!editCustomer}
        onClose={() => setEditCustomer(null)}
        title="Edit Customer"
        subtitle="Update this customer's details."
      >
        {editCustomer && (
          <EditCustomerForm
            customer={editCustomer}
            onClose={() => setEditCustomer(null)}
            onSuccess={handleSuccess}
          />
        )}
      </Drawer>

      {/* Deactivate / Activate confirm */}
      <ConfirmDialog
        open={!!deactivateCust}
        title={activating ? 'Activate Customer' : 'Deactivate Customer'}
        description={
          activating
            ? `Activate ${deactivateCust?.name}? They will be visible and accessible again.`
            : `Deactivate ${deactivateCust?.name}? They will be hidden from active customer lists.`
        }
        confirmLabel={activating ? 'Activate' : 'Deactivate'}
        variant={activating ? 'primary' : 'danger'}
        loading={toggling}
        onConfirm={handleToggle}
        onClose={() => setDeactivateCust(null)}
      />
    </CustomerDrawerContext.Provider>
  );
}

// ── Add Customer Form ─────────────────────────────────────────────────────────

function AddCustomerForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const [state, dispatch, isPending] = useActionState<CustomerActionState, FormData>(
    createCustomerAction,
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
        name="name"
        required
        placeholder="e.g. Fatima Hassan"
        autoFocus
      />
      <Input
        label="Phone"
        name="phone"
        type="tel"
        placeholder="+249…"
      />
      <Input
        label="Email"
        name="email"
        type="email"
        placeholder="customer@example.com"
      />
      <Input
        label="Address"
        name="address"
        placeholder="Street, city…"
      />
      <div className="space-y-1.5">
        <label className="text-[12.5px] font-semibold text-foreground">Notes</label>
        <textarea
          name="notes"
          rows={3}
          placeholder="Any notes about this customer…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button size="sm" type="submit" disabled={isPending}>
          {isPending ? 'Adding…' : 'Add customer'}
        </Button>
        <Button size="sm" variant="secondary" type="button" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ── Edit Customer Form ────────────────────────────────────────────────────────

function EditCustomerForm({
  customer,
  onClose,
  onSuccess,
}: {
  customer:  Customer;
  onClose:   () => void;
  onSuccess: () => void;
}) {
  const boundAction = updateCustomerAction.bind(null, customer.id);
  const [state, dispatch, isPending] = useActionState<CustomerActionState, FormData>(
    boundAction,
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
        name="name"
        required
        defaultValue={customer.name}
        placeholder="e.g. Fatima Hassan"
      />
      <Input
        label="Phone"
        name="phone"
        type="tel"
        defaultValue={customer.phone ?? ''}
        placeholder="+249…"
      />
      <Input
        label="Email"
        name="email"
        type="email"
        defaultValue={customer.email ?? ''}
        placeholder="customer@example.com"
      />
      <Input
        label="Address"
        name="address"
        defaultValue={customer.address ?? ''}
        placeholder="Street, city…"
      />
      <div className="space-y-1.5">
        <label className="text-[12.5px] font-semibold text-foreground">Notes</label>
        <textarea
          name="notes"
          rows={3}
          defaultValue={customer.notes}
          placeholder="Any notes about this customer…"
          className="w-full rounded-lg border border-border bg-background px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring resize-none"
        />
      </div>

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

function InlineError({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-3">
      <AlertCircle size={13} className="text-destructive shrink-0 mt-0.5" />
      <p className="text-[12px] font-semibold text-destructive leading-relaxed">{message}</p>
    </div>
  );
}
