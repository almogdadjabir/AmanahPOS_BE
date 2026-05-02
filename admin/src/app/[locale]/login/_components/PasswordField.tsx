"use client";

import { useTranslations } from "next-intl";

type Props = {
  t: ReturnType<typeof useTranslations<"auth">>;
  showPass: boolean;
  onToggleShowPass: () => void;
};

export default function PasswordField({
  t,
  showPass,
  onToggleShowPass,
}: Props) {
  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor="password"
        className="text-sm font-semibold text-text-primary"
      >
        {t("password")}
      </label>

      <div className="relative" dir="ltr">
        <input
          id="password"
          name="password"
          type={showPass ? "text" : "password"}
          dir="ltr"
          placeholder={t("passwordPlaceholder")}
          autoComplete="current-password"
          className="w-full h-10 pl-3.5 pr-10 rounded-xl border border-border-soft bg-white text-sm text-text-primary placeholder:text-text-hint focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all text-left"
        />

        <button
          type="button"
          onClick={onToggleShowPass}
          tabIndex={-1}
          className="absolute inset-y-0 right-3 flex items-center text-text-hint hover:text-text-secondary transition-colors"
          aria-label={showPass ? "Hide password" : "Show password"}
        >
          {showPass ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}
