'use client';

import { useActionState, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { updateBusinessProfileAction, type UpdateBusinessProfileState } from '@/actions/settings';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CheckCircle2, Building2, Camera } from 'lucide-react';
import type { Business } from '@/types/api';

interface Props {
  business: Business;
}

export default function BusinessProfileForm({ business }: Props) {
  const t = useTranslations('settings.profile');

  const [logoPreview, setLogoPreview] = useState<string | null>(business.logo);

  const fileRef    = useRef<HTMLInputElement>(null);
  const nameRef    = useRef<HTMLInputElement>(null);
  const emailRef   = useRef<HTMLInputElement>(null);
  const addressRef = useRef<HTMLTextAreaElement>(null);

  const [state, formAction, isPending] = useActionState<UpdateBusinessProfileState, FormData>(
    updateBusinessProfileAction,
    null,
  );

  function handleSave() {
    const formData = new FormData();
    formData.set('business_id', business.id);
    formData.set('name', nameRef.current?.value ?? '');
    formData.set('email', emailRef.current?.value ?? '');
    formData.set('address', addressRef.current?.value ?? '');
    const logoFile = fileRef.current?.files?.[0];
    if (logoFile) formData.set('logo', logoFile);
    formAction(formData);
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">

        {/* Logo + name */}
        <div className="flex items-end gap-4">
          <div>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) setLogoPreview(URL.createObjectURL(f));
              }}
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="group relative w-16 h-16 rounded-xl border border-dashed border-input bg-muted/30 hover:border-primary/40 hover:bg-primary/[0.02] transition-all overflow-hidden flex items-center justify-center shrink-0"
              aria-label={t('logoLabel')}
            >
              {logoPreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logoPreview} alt="" className="absolute inset-0 w-full h-full object-cover" />
              ) : (
                <Building2 size={22} className="text-muted-foreground/50" />
              )}
              <div className="absolute inset-0 bg-black/35 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera size={16} className="text-white" />
              </div>
            </button>
          </div>

          <div className="flex-1">
            <Input
              ref={nameRef}
              label={t('nameLabel')}
              defaultValue={business.name}
              required
              maxLength={255}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            type="tel"
            label={t('phoneLabel')}
            hint={t('phoneHint')}
            value={business.phone ?? ''}
            placeholder="+249 9XX XXX XXX"
            disabled
          />
          <Input
            ref={emailRef}
            type="email"
            label={t('emailLabel')}
            defaultValue={business.email ?? ''}
            placeholder="biz@example.com"
          />
        </div>

        <Textarea
          ref={addressRef}
          label={t('addressLabel')}
          defaultValue={business.address ?? ''}
          rows={2}
          placeholder={t('addressPlaceholder')}
        />

        {state && 'error' in state && (
          <p className="text-xs font-medium text-destructive">{state.error}</p>
        )}

        <div className="flex items-center gap-3 pt-1 mt-auto">
          <Button onClick={handleSave} disabled={isPending}>
            {isPending ? t('saving') : t('save')}
          </Button>
          {state && 'success' in state && state.success && (
            <span className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-success">
              <CheckCircle2 size={14} />
              {t('saved')}
            </span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
