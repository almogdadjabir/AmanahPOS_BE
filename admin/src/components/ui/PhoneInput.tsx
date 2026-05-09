'use client';

import { useRef } from 'react';
import { cn } from '@/lib/utils';

export const COUNTRY_CODE = '+249';

export function validateSudanesePhone(local: string): string | null {
  const digits = local.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return null;
  return digits;
}

interface PhoneInputProps {
  label?:           string;
  hint?:            string;
  required?:        boolean;
  phoneName?:       string;
  countryCodeName?: string;
  placeholder?:     string;
  autoFocus?:       boolean;
  disabled?:        boolean;
  defaultValue?:    string;
  className?:       string;
}

export default function PhoneInput({
  label           = 'Phone number',
  hint,
  required,
  phoneName       = 'phone_local',
  countryCodeName = 'country_code',
  placeholder     = '912345678',
  autoFocus,
  disabled,
  defaultValue,
  className,
}: PhoneInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    let raw = e.clipboardData.getData('text').replace(/\s+/g, '');
    if      (raw.startsWith('+249'))  raw = raw.slice(4);
    else if (raw.startsWith('00249')) raw = raw.slice(5);
    else if (raw.startsWith('249'))   raw = raw.slice(3);
    raw = raw.replace(/^0+/, '').replace(/\D/g, '');
    if (inputRef.current) inputRef.current.value = raw;
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <label className="text-[12.5px] font-semibold text-foreground">
          {label}
          {required && <span className="text-destructive ms-0.5">*</span>}
        </label>
      )}
      <input type="hidden" name={countryCodeName} value={COUNTRY_CODE} />
      <div className="flex h-11 rounded-xl border border-border overflow-hidden bg-card focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        <div
          dir="ltr"
          className="flex items-center gap-2 px-3 bg-muted border-e border-border shrink-0 select-none"
        >
          <span className="text-base leading-none">🇸🇩</span>
          <span className="text-sm font-bold text-muted-foreground">{COUNTRY_CODE}</span>
        </div>
        <input
          ref={inputRef}
          name={phoneName}
          type="tel"
          dir="ltr"
          inputMode="numeric"
          pattern="[0-9]{7,15}"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          disabled={disabled}
          required={required}
          placeholder={placeholder}
          defaultValue={defaultValue}
          onPaste={handlePaste}
          className="flex-1 h-full px-3 bg-card text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-60 [direction:ltr] text-left"
        />
      </div>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
