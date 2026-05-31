"use client";

type Props = {
  label?: string;
  hint?: string;
  required?: boolean;
  phoneName?: string;
  countryCodeName?: string;
  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
  heightClassName?: string;
  inputClassName?: string;
};

export const SUDAN_COUNTRY_CODE = "+249";

export default function SudanPhoneField({
  label = "Phone number",
  hint,
  required,
  phoneName = "phone_local",
  countryCodeName = "country_code",
  placeholder = "912345678",
  autoFocus,
  disabled,
  heightClassName = "h-10",
  inputClassName = "text-sm",
}: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-foreground">
        {label}
        {required && <span className="text-danger ms-0.5">*</span>}
      </label>

      <input type="hidden" name={countryCodeName} value={SUDAN_COUNTRY_CODE} />

      <div
        className={`flex ${heightClassName} rounded-xl border border-border overflow-hidden bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all`}
      >
        <div
          dir="ltr"
          className="flex items-center gap-2 px-3 bg-muted/40 border-e border-border shrink-0 select-none"
        >
          <span className="text-base leading-none">🇸🇩</span>
          <span className="text-sm font-bold text-muted-foreground">
            {SUDAN_COUNTRY_CODE}
          </span>
        </div>

        <input
          name={phoneName}
          type="tel"
          dir="ltr"
          inputMode="numeric"
          autoComplete="tel-national"
          autoFocus={autoFocus}
          disabled={disabled}
          required={required}
          pattern="[0-9]{7,15}"
          placeholder={placeholder}
          className={`flex-1 h-full px-3 bg-white text-left text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60 ${inputClassName}`}
        />
      </div>

      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
