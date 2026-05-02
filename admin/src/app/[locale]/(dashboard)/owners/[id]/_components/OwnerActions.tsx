'use client';

import { useActionState, useState, useTransition } from 'react';
import { toggleOwnerStatusAction, updateOwnerAction, type UpdateOwnerState } from '@/actions/owners';
import type { AdminOwnerDetail } from '@/types/api';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ds/ConfirmDialog';

// ── Toggle status ─────────────────────────────────────────────────────────────

export function ToggleStatusButton({ owner }: { owner: AdminOwnerDetail }) {
  const [open, setOpen]       = useState(false);
  const [isPending, start]    = useTransition();
  const [result, setResult]   = useState<{ error?: string } | null>(null);

  async function handleConfirm() {
    start(async () => {
      const res = await toggleOwnerStatusAction(owner.id);
      if (res && 'error' in res) {
        setResult({ error: res.error });
      }
      setOpen(false);
    });
  }

  const isActive = owner.is_active;

  return (
    <>
      {result?.error && (
        <p className="text-[11px] text-danger mt-1">{result.error}</p>
      )}
      <Button
        variant={isActive ? 'danger' : 'default'}
        size="sm"
        onClick={() => setOpen(true)}
        disabled={isPending}
      >
        {isActive ? <><BanIcon /> Deactivate</> : <><CheckIcon /> Activate</>}
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

// ── Edit owner inline form ────────────────────────────────────────────────────

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
        <EditIcon /> Edit
      </Button>

      {!open ? null : (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-[15px] font-bold text-text-primary">Edit Owner</p>
              <button onClick={() => setOpen(false)} className="text-text-hint hover:text-text-primary">
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

const inputCls =
  'w-full h-9 px-3 rounded-lg border border-border-soft bg-white text-[13px] text-text-primary placeholder:text-text-hint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-colors';

function BanIcon()   { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>; }
function CheckIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>; }
function EditIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>; }
function XIcon()     { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>; }
