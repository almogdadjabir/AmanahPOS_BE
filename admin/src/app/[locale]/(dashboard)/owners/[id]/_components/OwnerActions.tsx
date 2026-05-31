'use client';

import { useActionState, useState, useTransition } from 'react';
import { Ban, Check, Edit, X } from 'lucide-react';
import { toggleOwnerStatusAction, updateOwnerAction, type UpdateOwnerState } from '@/actions/owners';
import type { AdminOwnerDetail } from '@/types/api';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/ds/ConfirmDialog';

export function ToggleStatusButton({ owner }: { owner: AdminOwnerDetail }) {
  const [open, setOpen]     = useState(false);
  const [isPending, start]  = useTransition();
  const [result, setResult] = useState<{ error?: string } | null>(null);

  async function handleConfirm() {
    start(async () => {
      const res = await toggleOwnerStatusAction(owner.id);
      if (res && 'error' in res) setResult({ error: res.error });
      setOpen(false);
    });
  }

  const isActive = owner.is_active;

  return (
    <>
      {result?.error && (
        <p className="text-[11px] text-destructive mt-1">{result.error}</p>
      )}
      <Button
        variant={isActive ? 'destructive' : 'default'}
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isPending}
      >
        {isActive ? <><Ban className="size-3.5" /> Deactivate</> : <><Check className="size-3.5" /> Activate</>}
      </Button>

      <ConfirmDialog
        open={open}
        title={isActive ? 'Deactivate owner?' : 'Activate owner?'}
        description={
          isActive
            ? `${owner.full_name || owner.phone} will no longer be able to log in or access their account.`
            : `${owner.full_name || owner.phone} will regain full access to their account.`
        }
        confirmLabel={isActive ? 'Deactivate' : 'Activate'}
        variant={isActive ? 'danger' : 'primary'}
        loading={isPending}
        onConfirm={handleConfirm}
        onClose={() => setOpen(false)}
      />
    </>
  );
}

export function EditOwnerForm({ owner }: { owner: AdminOwnerDetail }) {
  const [open, setOpen] = useState(false);

  const boundAction = updateOwnerAction.bind(null, owner.id);
  const [state, dispatch, isPending] = useActionState<UpdateOwnerState, FormData>(
    boundAction,
    null,
  );

  const error   = state && 'error'   in state ? state.error   : null;
  const success = state && 'success' in state ? state.success : false;

  if (success && open) setOpen(false);

  return (
    <>
      <Button variant="default" size="sm" onClick={() => setOpen(true)}>
        <Edit className="size-3.5" /> Edit
      </Button>

      {!open ? null : (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="relative bg-card rounded-xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold text-foreground">Edit Owner</p>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="size-4" />
              </button>
            </div>

            {error && (
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2">
                <p className="text-[12px] font-semibold text-destructive">{error}</p>
              </div>
            )}

            <form action={dispatch} className="space-y-4">
              <div>
                <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
                  Full name <span className="text-destructive">*</span>
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
                <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
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

              <div className="flex justify-end gap-2 pt-1 border-t border-border">
                <Button variant="secondary" size="sm" type="button" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button variant="default" size="sm" type="submit" disabled={isPending}>
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

const inputCls =
  'w-full h-9 px-3 rounded-lg border border-border bg-card text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors';
