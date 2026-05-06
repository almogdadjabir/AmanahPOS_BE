'use client';

import { useTranslations } from 'next-intl';
import { Eye, EyeOff } from 'lucide-react';

type Props = {
  t: ReturnType<typeof useTranslations<'auth'>>;
  showPass: boolean;
  onToggleShowPass: () => void;
};

export default function PasswordField({ t, showPass, onToggleShowPass }: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor="password" className="text-sm font-semibold text-foreground">
        {t('password')}
      </label>

      <div className="relative" dir="ltr">
        <input
          id="password"
          name="password"
          type={showPass ? 'text' : 'password'}
          dir="ltr"
          placeholder={t('passwordPlaceholder')}
          autoComplete="current-password"
          className="w-full h-10 pl-3.5 pr-10 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-left"
        />

        <button
          type="button"
          onClick={onToggleShowPass}
          tabIndex={-1}
          className="absolute inset-y-0 right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
          aria-label={showPass ? 'Hide password' : 'Show password'}
        >
          {showPass ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
    </div>
  );
}
