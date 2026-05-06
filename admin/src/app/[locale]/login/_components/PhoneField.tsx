'use client';

import { useTranslations } from 'next-intl';

const COUNTRY_CODE = '+249';

type Props = {
  t: ReturnType<typeof useTranslations<'auth'>>;
};

export default function PhoneField({ t }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-foreground">
        {t('phone')}
      </label>

      <div className="flex h-10 rounded-xl border border-border overflow-hidden focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all bg-card">
        <div
          dir="ltr"
          className="flex items-center gap-2 px-3 bg-muted border-e border-border shrink-0 select-none"
        >
          <span className="text-base leading-none">🇸🇩</span>
          <span className="text-sm font-bold text-muted-foreground">{COUNTRY_CODE}</span>
        </div>

        <input
          name="phone_local"
          type="tel"
          dir="ltr"
          placeholder={t('phonePlaceholder')}
          autoComplete="tel-national"
          autoFocus
          inputMode="numeric"
          className="flex-1 h-full px-3 bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none text-left"
        />
      </div>
    </div>
  );
}

export { COUNTRY_CODE };
