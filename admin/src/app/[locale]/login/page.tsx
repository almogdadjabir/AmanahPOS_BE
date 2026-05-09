'use client';

import { useActionState, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { CheckCircle, Loader2 } from 'lucide-react';

import Logo from '@/components/ui/Logo';
import { loginAction, requestOtpAction, verifyOtpAction } from '@/actions/auth';

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

  function resetOtp()             { setOtpPhone(''); }
  function switchMode(next: Mode) { setMode(next); setOtpPhone(''); }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F8FAFC] px-4 py-12 relative">
      <LanguageSwitcher />

      <div className="w-full max-w-[400px]">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Logo size={44} />
          <span className="mt-2.5 text-[20px] font-black tracking-tight text-[#0F172A]">AmanaPOS</span>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border border-[#E2E8F0] shadow-[0_4px_40px_rgba(15,23,42,0.07)] px-7 py-7">
          <h1 className="text-[22px] font-black tracking-tight text-foreground">{t('headline')}</h1>
          <p className="mt-1.5 text-sm font-medium text-muted-foreground">{t('subheadline')}</p>

          {/* Mode toggle */}
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

          {/* OTP: step 1 — request code */}
          {mode === 'otp' && !inCodeStep && (
            <form action={sendAction} className="mt-6 space-y-4">
              <PhoneField t={t} />

              {sendState && 'error' in sendState && sendState.error && (
                <p className="text-sm font-semibold text-destructive">
                  {t(`errors.${sendState.error}` as Parameters<typeof t>[0])}
                </p>
              )}

              <button
                type="submit"
                disabled={sendPending}
                className="w-full h-11 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {sendPending
                  ? <><Loader2 size={15} className="animate-spin" />{t('sendingCode')}</>
                  : t('sendCode')}
              </button>
            </form>
          )}

          {/* OTP: step 2 — verify code */}
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
                  <label className="text-sm font-semibold text-foreground">{t('otpLabel')}</label>
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
                  <p className="text-sm font-semibold text-destructive">
                    {t(`errors.${verifyState.error}` as Parameters<typeof t>[0])}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={verifyPending}
                  className="w-full h-11 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {verifyPending
                    ? <><Loader2 size={15} className="animate-spin" />{t('verifyingCode')}</>
                    : t('verifyCode')}
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

          {/* Password login */}
          {mode === 'password' && (
            <form action={passAction} className="mt-6 space-y-4">
              <input type="hidden" name="locale"       value={locale} />
              <input type="hidden" name="country_code" value={COUNTRY_CODE} />

              <PhoneField t={t} />

              <PasswordField
                t={t}
                showPass={showPass}
                onToggleShowPass={() => setShowPass((v) => !v)}
              />

              {passState?.error && (
                <p className="text-sm font-semibold text-destructive">
                  {t(`errors.${passState.error}` as Parameters<typeof t>[0])}
                </p>
              )}

              <button
                type="submit"
                disabled={passPending}
                className="w-full h-11 bg-primary text-primary-foreground text-sm font-bold rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-60 flex items-center justify-center gap-2 mt-1"
              >
                {passPending
                  ? <><Loader2 size={15} className="animate-spin" />{t('loggingIn')}</>
                  : t('submit')}
              </button>
            </form>
          )}
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          © 2026 AmanaPOS · Made in Khartoum
        </p>
      </div>
    </div>
  );
}
