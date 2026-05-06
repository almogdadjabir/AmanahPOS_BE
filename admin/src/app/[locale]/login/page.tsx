'use client';

import { useActionState, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Check, CheckCircle } from 'lucide-react';

import Logo from '@/components/ui/Logo';
import { loginAction, requestOtpAction, verifyOtpAction } from '@/actions/auth';

import ErrorBanner from './_components/ErrorBanner';
import LanguageSwitcher from './_components/LanguageSwitcher';
import PasswordField from './_components/PasswordField';
import PhoneField, { COUNTRY_CODE } from './_components/PhoneField';

type Mode = 'password' | 'otp';

export default function LoginPage() {
  const t      = useTranslations('auth');
  const locale = useLocale();

  const [mode,     setMode]     = useState<Mode>('otp');
  const [otpPhone, setOtpPhone] = useState('');
  const [showPass, setShowPass] = useState(false);

  const [passState,   passAction,   passPending]   = useActionState(loginAction,      null);
  const [sendState,   sendAction,   sendPending]   = useActionState(requestOtpAction, null);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyOtpAction,  null);

  useEffect(() => {
    if (sendState && 'sent' in sendState && sendState.sent) {
      setOtpPhone(sendState.phone);
    }
  }, [sendState]);

  const inCodeStep = mode === 'otp' && otpPhone !== '';

  function resetOtp()           { setOtpPhone(''); }
  function switchMode(next: Mode) { setMode(next); setOtpPhone(''); }

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      {/* Brand panel */}
      <div className="hidden lg:flex lg:w-[45%] bg-deep flex-col justify-between p-10 relative overflow-hidden">
        <div className="absolute top-0 start-0 w-96 h-96 rounded-full bg-primary/20 blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 end-0 w-64 h-64 rounded-full bg-primary/10 blur-[80px] pointer-events-none" />

        <div className="relative flex items-center gap-3">
          <Logo size={40} />
          <div>
            <div className="text-white text-base font-black">{t('brandTitle')}</div>
            <div className="text-[11px] font-bold text-primary-light mt-0.5">{t('brandSubtitle')}</div>
          </div>
        </div>

        <div className="relative">
          <h2 className="text-white text-[clamp(26px,2.8vw,36px)] font-black leading-snug tracking-tight">
            {t('brandTagline')}
          </h2>

          <ul className="mt-8 space-y-4">
            {(['brandF1', 'brandF2', 'brandF3'] as const).map((key) => (
              <li key={key} className="flex items-start gap-3">
                <span className="mt-0.5 w-5 h-5 rounded-full bg-primary/30 text-primary-light flex items-center justify-center shrink-0">
                  <Check className="size-2.5" strokeWidth={3} />
                </span>
                <span className="text-sm font-semibold text-white/70">{t(key)}</span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-white/25 font-semibold">
          © 2026 AmanaPOS · Made in Khartoum
        </p>
      </div>

      {/* Form panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-background relative">
        <LanguageSwitcher />

        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <Logo size={36} />
          <span className="text-base font-black text-foreground">{t('brandTitle')}</span>
        </div>

        <div className="w-full max-w-[360px]">
          <h1 className="text-[26px] font-black tracking-tight text-foreground">
            {t('headline')}
          </h1>

          <p className="mt-1.5 text-sm font-medium text-muted-foreground">
            {t('subheadline')}
          </p>

          {!inCodeStep && (
            <div className="mt-6 flex rounded-xl border border-border bg-muted p-1 gap-1">
              {(['otp', 'password'] as Mode[]).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => switchMode(m)}
                  className={`flex-1 h-8 rounded-lg text-[13px] font-semibold transition-all ${
                    mode === m
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {m === 'otp' ? t('modeOtp') : t('modePassword')}
                </button>
              ))}
            </div>
          )}

          {mode === 'otp' && !inCodeStep && (
            <form action={sendAction} className="mt-6 space-y-4">
              <PhoneField t={t} />

              {'error' in (sendState ?? {}) && sendState && 'error' in sendState && (
                <ErrorBanner
                  message={t(`errors.${sendState.error}` as Parameters<typeof t>[0])}
                />
              )}

              <button
                type="submit"
                disabled={sendPending}
                className="w-full h-10 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
              >
                {sendPending ? t('sendingCode') : t('sendCode')}
              </button>
            </form>
          )}

          {mode === 'otp' && inCodeStep && (
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-5 p-3 bg-success/10 rounded-xl border border-success/20">
                <div className="w-7 h-7 rounded-full bg-success/10 text-success flex items-center justify-center shrink-0">
                  <CheckCircle className="size-3.5" />
                </div>

                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-success">{t('codeSentTo')}</p>
                  <p className="text-[13px] font-bold text-foreground truncate">{otpPhone}</p>
                </div>

                <button
                  type="button"
                  onClick={resetOtp}
                  className="ms-auto text-[11px] font-semibold text-muted-foreground hover:text-foreground shrink-0 transition-colors"
                >
                  {t('changeNumber')}
                </button>
              </div>

              <form action={verifyAction} className="space-y-4">
                <input type="hidden" name="phone"  value={otpPhone} />
                <input type="hidden" name="locale" value={locale} />

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-semibold text-foreground">
                    {t('otpLabel')}
                  </label>

                  <input
                    name="otp"
                    type="text"
                    dir="ltr"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={8}
                    placeholder={t('otpPlaceholder')}
                    autoComplete="one-time-code"
                    autoFocus
                    className="w-full h-14 px-4 rounded-xl border border-border bg-card text-[28px] font-black text-center tracking-[0.5em] text-foreground placeholder:text-muted-foreground placeholder:text-[18px] placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  />
                </div>

                {verifyState?.error && (
                  <ErrorBanner
                    message={t(`errors.${verifyState.error}` as Parameters<typeof t>[0])}
                  />
                )}

                <button
                  type="submit"
                  disabled={verifyPending}
                  className="w-full h-10 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60"
                >
                  {verifyPending ? t('verifyingCode') : t('verifyCode')}
                </button>

                <button
                  type="button"
                  onClick={resetOtp}
                  className="w-full h-9 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                >
                  {t('resendCode')}
                </button>
              </form>
            </div>
          )}

          {mode === 'password' && (
            <form action={passAction} className="mt-6 space-y-4">
              <input type="hidden" name="locale"        value={locale} />
              <input type="hidden" name="country_code"  value={COUNTRY_CODE} />

              <PhoneField t={t} />

              <PasswordField
                t={t}
                showPass={showPass}
                onToggleShowPass={() => setShowPass((v) => !v)}
              />

              {passState?.error && (
                <ErrorBanner
                  message={t(`errors.${passState.error}` as Parameters<typeof t>[0])}
                />
              )}

              <button
                type="submit"
                disabled={passPending}
                className="w-full h-10 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 mt-1"
              >
                {passPending ? t('loggingIn') : t('submit')}
              </button>
            </form>
          )}

          <p className="mt-10 text-center text-xs text-muted-foreground">
            © 2026 AmanaPOS · Made in Khartoum
          </p>
        </div>
      </div>
    </div>
  );
}
