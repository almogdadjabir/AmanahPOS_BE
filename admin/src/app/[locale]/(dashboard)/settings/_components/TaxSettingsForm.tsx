'use client';

import { useActionState, useState } from 'react';
import { useTranslations } from 'next-intl';
import { updateTaxSettingsAction, type UpdateTaxSettingsState } from '@/actions/settings';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { CheckCircle2, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Business } from '@/types/api';

interface Props {
  business: Business;
}

export default function TaxSettingsForm({ business }: Props) {
  const t = useTranslations('settings.tax');

  const [enabled, setEnabled]     = useState(business.tax_enabled);
  const [name, setName]           = useState(business.tax_name);
  const [rate, setRate]           = useState(business.tax_rate);
  const [inclusive, setInclusive] = useState(business.tax_inclusive);

  const [state, formAction, isPending] = useActionState<UpdateTaxSettingsState, FormData>(
    updateTaxSettingsAction,
    null,
  );

  function handleSave() {
    const formData = new FormData();
    formData.set('business_id', business.id);
    formData.set('tax_enabled', String(enabled));
    formData.set('tax_name', name);
    formData.set('tax_rate', rate);
    formData.set('tax_inclusive', String(inclusive));
    formAction(formData);
  }

  return (
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
        <CardDescription>{t('description')}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col space-y-4">

        <ToggleRow
          label={t('enableLabel')}
          hint={t('enableHint')}
          enabled={enabled}
          onToggle={() => setEnabled(v => !v)}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label={t('nameLabel')}
            hint={t('nameHint')}
            value={name}
            onChange={e => setName(e.target.value)}
            disabled={!enabled}
            maxLength={50}
          />
          <Input
            type="number"
            min={0}
            max={100}
            step="0.01"
            label={t('rateLabel')}
            hint={t('rateHint')}
            value={rate}
            onChange={e => setRate(e.target.value)}
            disabled={!enabled}
            iconRight={<Percent size={14} />}
          />
        </div>

        <ToggleRow
          label={t('inclusiveLabel')}
          hint={t('inclusiveHint')}
          enabled={inclusive}
          onToggle={() => setInclusive(v => !v)}
          disabled={!enabled}
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

// ── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({
  label, hint, enabled, onToggle, disabled,
}: {
  label: string;
  hint?: string;
  enabled: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 p-4 rounded-xl border border-border bg-background">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={enabled}
        className={cn(
          'relative w-11 h-6 rounded-full transition-colors shrink-0',
          enabled ? 'bg-primary' : 'bg-muted-foreground/30',
          disabled && 'opacity-50 cursor-not-allowed',
        )}
      >
        <span className={cn(
          'absolute top-0.5 start-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform',
          enabled ? 'translate-x-5 [dir=rtl]:-translate-x-5' : 'translate-x-0',
        )} />
      </button>
    </div>
  );
}
