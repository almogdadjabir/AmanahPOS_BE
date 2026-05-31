"use client";

type CountryCodeOption = {
  code: string;
  label: string;
  flag?: string;
};

type Props = {
  label?: string;
  hint?: string;
  required?: boolean;

  countryCodeName?: string;
  phoneName?: string;

  defaultCountryCode?: string;
  countryCodes?: readonly CountryCodeOption[];

  placeholder?: string;
  autoFocus?: boolean;
  disabled?: boolean;
};

const DEFAULT_COUNTRY_CODES = [
  { code: "+249", label: "SD +249", flag: "🇸🇩" },
  { code: "+971", label: "AE +971", flag: "🇦🇪" },
  { code: "+966", label: "SA +966", flag: "🇸🇦" },
  { code: "+20", label: "EG +20", flag: "🇪🇬" },
  { code: "+1", label: "US +1", flag: "🇺🇸" },
] as const;

export default function PhoneNumberField({
  label = "Phone number",
  hint,
  required,
  countryCodeName = "country_code",
  phoneName = "phone_local",
  defaultCountryCode = "+249",
  countryCodes = DEFAULT_COUNTRY_CODES,
  placeholder = "912345678",
  autoFocus,
  disabled,
}: Props) {
  return (
    <div>
      <label className="block text-[12px] font-semibold text-muted-foreground mb-1.5">
        {label}
        {required && <span className="text-danger ml-0.5">*</span>}
      </label>

      <div className="flex h-9 rounded-lg border border-border overflow-hidden bg-white focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20 transition-all">
        <select
          name={countryCodeName}
          defaultValue={defaultCountryCode}
          disabled={disabled}
          dir="ltr"
          className="h-full min-w-[98px] px-2 bg-muted/40 border-e border-border text-[13px] font-semibold text-muted-foreground focus:outline-none disabled:opacity-60"
        >
          {countryCodes.map((country) => (
            <option key={country.code} value={country.code}>
              {country.flag ? `${country.flag} ` : ""}
              {country.label}
            </option>
          ))}
        </select>

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
          className="flex-1 h-full px-3 bg-white text-left text-[13px] text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-60"
        />
      </div>

      {hint && <p className="text-[11px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

export { DEFAULT_COUNTRY_CODES };
