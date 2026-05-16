'use client';

import { useActionState, useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Drawer from '@/components/ds/Drawer';
import {
  createVendorAction,
  updateVendorAction,
  type VendorFormState,
} from '@/actions/inventory';
import type { Vendor } from '@/types/api';

interface Props {
  open:      boolean;
  vendor:    Vendor | null;
  onClose:   () => void;
  onSuccess: (vendor: Vendor) => void;
}

export default function VendorDrawer({ open, vendor, onClose, onSuccess }: Props) {
  const t = useTranslations('inventory');
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={vendor ? t('vendors.editVendor') : t('vendors.addVendor')}
    >
      {open && (
        <VendorForm
          key={vendor?.id ?? 'new'}
          vendor={vendor}
          onClose={onClose}
          onSuccess={onSuccess}
        />
      )}
    </Drawer>
  );
}

function VendorForm({
  vendor,
  onClose,
  onSuccess,
}: {
  vendor:    Vendor | null;
  onClose:   () => void;
  onSuccess: (v: Vendor) => void;
}) {
  const t = useTranslations('inventory');
  const action = vendor ? updateVendorAction : createVendorAction;

  const [state, dispatch, isPending] = useActionState<VendorFormState, FormData>(action, null);

  useEffect(() => {
    if (state && 'success' in state) onSuccess(state.vendor);
  }, [state, onSuccess]);

  const error = state && 'error' in state ? state.error : null;

  return (
    <form action={dispatch} className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {error && (
          <div className="flex items-start gap-2.5 rounded-lg border border-destructive/20 bg-destructive/5 px-3.5 py-3">
            <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
            <p className="text-xs font-semibold text-destructive leading-relaxed">{error}</p>
          </div>
        )}

        {vendor && <input type="hidden" name="id" value={vendor.id} />}

        <Input
          label={t('vendors.name')}
          name="name"
          required
          defaultValue={vendor?.name ?? ''}
          placeholder={t('vendors.namePlaceholder')}
        />
        <Input
          label={t('vendors.phone')}
          name="phone"
          type="tel"
          defaultValue={vendor?.phone ?? ''}
        />
        <Input
          label={t('vendors.email')}
          name="email"
          type="email"
          defaultValue={vendor?.email ?? ''}
        />
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1.5">
            {t('vendors.address')}
          </label>
          <textarea
            name="address"
            rows={2}
            defaultValue={vendor?.address ?? ''}
            className="flex w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors resize-none"
          />
        </div>
        <div>
          <label className="text-sm font-semibold text-foreground block mb-1.5">
            {t('vendors.notes')}
          </label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={vendor?.notes ?? ''}
            className="flex w-full rounded-md border border-input bg-background px-3.5 py-2 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 transition-colors resize-none"
          />
        </div>
      </div>

      <div className="shrink-0 flex items-center justify-end gap-2 px-5 py-4 border-t border-border">
        <Button variant="outline" size="sm" type="button" onClick={onClose}>
          {t('common.cancel')}
        </Button>
        <Button size="sm" type="submit" disabled={isPending}>
          {isPending ? t('vendors.saving') : t('vendors.save')}
        </Button>
      </div>
    </form>
  );
}
