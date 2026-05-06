'use client';

import { useActionState, useRef } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Info } from 'lucide-react';

import { createOwnerAction, type CreateOwnerState } from '@/actions/owners';
import { Button } from '@/components/ui/button';

import CreateOwnerHeader from './CreateOwnerHeader';
import OwnerFormField from './OwnerFormField';
import { ownerInputClassName } from './createOwner.constants';
import SudanPhoneField from '@/components/ui/SudanPhoneField';

export default function CreateOwnerForm() {
  const params = useParams();
  const locale = (params.locale as string) || 'ar';

  const [state, dispatch, isPending] = useActionState<CreateOwnerState, FormData>(
    createOwnerAction,
    null,
  );

  const formRef = useRef<HTMLFormElement>(null);
  const error   = state && 'error' in state ? state.error : null;

  return (
    <div className="max-w-lg">
      <CreateOwnerHeader locale={locale} />

      <div className="bg-card rounded-xl border border-border shadow-card p-6">
        <form ref={formRef} action={dispatch} className="space-y-5">
          <input type="hidden" name="locale" value={locale} />

          {error && (
            <div className="bg-destructive/10 border border-destructive/20 rounded-xl px-4 py-3">
              <p className="text-[13px] font-semibold text-destructive">{error}</p>
            </div>
          )}

          <OwnerFormField label="Full name" required>
            <input
              name="full_name"
              type="text"
              placeholder="e.g. Ahmed Al-Hassan"
              required
              className={ownerInputClassName}
            />
          </OwnerFormField>

          <SudanPhoneField
            label="Phone number"
            required
            hint="The owner will log in using this number via OTP."
            phoneName="phone_local"
            countryCodeName="country_code"
            placeholder="912345678"
            heightClassName="h-9"
            inputClassName="text-[13px]"
          />

          <OwnerFormField label="Email address" hint="Optional — used for notifications.">
            <input
              name="email"
              type="email"
              placeholder="owner@example.com"
              className={ownerInputClassName}
            />
          </OwnerFormField>

          <div className="bg-info/10 border border-info/20 rounded-xl px-4 py-3 flex gap-3">
            <Info className="size-4 text-info shrink-0 mt-0.5" />
            <p className="text-[12px] text-info leading-relaxed">
              The owner account will be created without a password. They can log
              in immediately via OTP sent to their phone.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-1 border-t border-border">
            <Button variant="secondary" size="sm" asChild>
              <Link href={`/${locale}/owners`}>Cancel</Link>
            </Button>

            <Button variant="default" size="sm" type="submit" disabled={isPending}>
              {isPending ? 'Creating…' : 'Create Owner'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
