'use client';

import { useActionState, useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

import Logo from '@/components/ui/Logo';
import { loginAction, requestOtpAction, verifyOtpAction } from '@/actions/auth';
import LanguageSwitcher from './_components/LanguageSwitcher';
import LoginPhoneInput from './_components/LoginPhoneInput';
import LoginPasswordInput from './_components/LoginPasswordInput';
import OtpInputGroup from './_components/OtpInputGroup';

type Step = 'enter' | 'otp' | 'success';
type Mode = 'otp' | 'password';

function formatPhone(phone: string): string {
  const m = phone.match(/^(\+\d{1,4})(\d{3})(\d{3})(\d+)$/);
  return m ? `${m[1]} ${m[2]} ${m[3]} ${m[4]}` : phone;
}

const BTN_BASE = [
  'w-full h-[52px] rounded-[14px] text-white font-bold text-[15.5px]',
  'flex items-center justify-center gap-2.5',
  'transition-all active:translate-y-px active:scale-[.995]',
  'disabled:opacity-55 disabled:cursor-not-allowed',
].join(' ');

const BTN_TEAL_STYLE = {
  background: 'linear-gradient(180deg, #1FB7A6 -40%, #0D7C72 40%, #0D6B63)',
  boxShadow: '0 1px 0 rgba(255,255,255,.25) inset, 0 10px 24px -12px rgba(13,124,114,.65)',
} as const;

function Spinner() {
  return <span className="login-spinner w-[19px] h-[19px]" aria-hidden="true" />;
}

function ArrowIcon({ rtl }: { rtl: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
      className="transition-transform duration-200 group-hover:translate-x-[3px]"
      style={rtl ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function BackIcon({ rtl }: { rtl: boolean }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
      style={rtl ? { transform: 'scaleX(-1)' } : undefined}>
      <path d="M19 12H5M11 18l-6-6 6-6" />
    </svg>
  );
}

function RememberCheckbox({ label }: { label: string }) {
  const [checked, setChecked] = useState(true);
  return (
    <label className="flex items-center gap-2 text-[13.5px] text-[#46535F] cursor-pointer select-none">
      <input
        type="checkbox"
        name="remember"
        checked={checked}
        onChange={e => setChecked(e.target.checked)}
        className="sr-only"
      />
      <span
        className="w-[19px] h-[19px] rounded-[6px] border-[1.5px] flex items-center justify-center transition-all duration-150 shrink-0"
        style={{
          borderColor: checked ? '#0D7C72' : '#DBE3EB',
          background: checked ? '#0D7C72' : '#fff',
        }}
        aria-hidden="true"
      >
        {checked && (
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white"
            strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </span>
      {label}
    </label>
  );
}

function PhoneChipIcon() {
  return (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0D7C72"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2A19.86 19.86 0 0 1 3.09 5.18 2 2 0 0 1 5.07 3h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L9.09 10.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

export default function LoginPage() {
  const t      = useTranslations('auth');
  const locale = useLocale();
  const isRtl  = locale === 'ar';

  const [step,       setStep]       = useState<Step>('enter');
  const [mode,       setMode]       = useState<Mode>('otp');
  const [otpKey,     setOtpKey]     = useState(0);
  const [otpError,   setOtpError]   = useState(false);
  const [resendSecs, setResendSecs] = useState(0);

  const [sendState,   sendAction,   sendPending]   = useActionState(requestOtpAction, null);
  const [verifyState, verifyAction, verifyPending] = useActionState(verifyOtpAction,  null);
  const [passState,   passAction,   passPending]   = useActionState(loginAction,      null);

  const sentPhone  = (sendState && 'sent' in sendState && sendState.sent) ? sendState.phone : '';
  const sendError  = (sendState && 'error' in sendState) ? sendState.error : null;

  // OTP sent → enter OTP step
  useEffect(() => {
    if (!sentPhone) return;
    setStep('otp');
    setOtpKey(k => k + 1);
    setOtpError(false);
    setResendSecs(30);
  }, [sentPhone]);

  // Verification error → go back to OTP input
  useEffect(() => {
    if (verifyState?.error) {
      setStep('otp');
      setOtpError(true);
    }
  }, [verifyState]);

  // Resend countdown
  useEffect(() => {
    if (resendSecs <= 0) return;
    const timer = setTimeout(() => setResendSecs(s => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendSecs]);

  function handleOtpComplete(code: string) {
    setOtpError(false);
    setStep('success');
    const fd = new FormData();
    fd.set('phone',  sentPhone);
    fd.set('otp',    code);
    fd.set('locale', locale);
    verifyAction(fd);
  }

  function handleResend() {
    if (resendSecs > 0 || !sentPhone) return;
    const local = sentPhone.startsWith('+249') ? sentPhone.slice(4) : sentPhone;
    const fd = new FormData();
    fd.set('phone_local',  local);
    fd.set('country_code', '+249');
    fd.set('channel',      'whatsapp');
    sendAction(fd);
  }

  function switchMode(next: Mode) {
    setMode(next);
    setOtpError(false);
  }

  // Pill transform for method toggle
  const pillTranslate = mode === 'password'
    ? isRtl ? 'translateX(-100%)' : 'translateX(100%)'
    : 'translateX(0)';

  return (
    <div
      className="login-wrapper min-h-[100dvh] relative overflow-hidden"
      style={{ background: '#F7F9FA' }}
    >
      {/* ── Background layer (absolute, sits behind content) ─────────────── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Aura blobs */}
        <div className="login-aura-1 absolute rounded-full" style={{
          width: 560, height: 560, top: -180, left: -160,
          background: 'radial-gradient(closest-side, rgba(31,183,166,.32), transparent)',
          filter: 'blur(70px)', opacity: .5,
        }} />
        <div className="login-aura-2 absolute rounded-full" style={{
          width: 520, height: 520, bottom: -200, right: -140,
          background: 'radial-gradient(closest-side, rgba(13,124,114,.22), transparent)',
          filter: 'blur(70px)', opacity: .5,
        }} />
        <div className="login-aura-3 absolute rounded-full" style={{
          width: 360, height: 360, top: '40%', right: '18%',
          background: 'radial-gradient(closest-side, rgba(212,182,117,.16), transparent)',
          filter: 'blur(70px)', opacity: .5,
        }} />
        {/* Grid overlay */}
        <div className="login-bg-grid absolute inset-0" />
      </div>

      {/* ── Language switcher ─────────────────────────────────────────────── */}
      <div className="fixed" style={{ top: 24, insetInlineEnd: 28, zIndex: 10 }}>
        <LanguageSwitcher />
      </div>

      {/* ── Shell (above background layer) ───────────────────────────────── */}
      <div className="relative flex flex-col items-center justify-center min-h-[100dvh] px-5 py-10">
      <div className="w-full max-w-[432px] flex flex-col items-center">

        {/* Brand block */}
        <div className="flex flex-col items-center gap-4 mb-7">
          <Logo size={56} />
          <div className="text-center">
            <div
              className="text-[23px] font-bold tracking-tight"
              style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}
            >
              AmanaPOS
            </div>
            <div className="text-[13px] text-[#7A8794] tracking-wide" style={{ marginTop: -2 }}>
              {isRtl ? 'نظام نقطة البيع' : 'Point of Sale · Platform'}
            </div>
          </div>
        </div>

        {/* ── Auth card ─────────────────────────────────────────────────── */}
        <div
          className="w-full bg-white rounded-[26px] border border-[#E9EEF3]"
          style={{
            padding: '36px 34px',
            boxShadow: '0 1px 2px rgba(12,21,33,.04), 0 22px 50px -28px rgba(12,21,33,.22)',
          }}
        >

          {/* ── Step: Success ─────────────────────────────────────────── */}
          {step === 'success' && (
            <div key="success" className="login-step-in flex flex-col items-center justify-center text-center gap-4 py-6">
              <div
                className="relative w-[84px] h-[84px] rounded-full flex items-center justify-center"
                style={{ background: '#F0FDFA' }}
              >
                <div className="login-ring-pulse absolute inset-0 rounded-full border-2 border-[#0D7C72]" />
                <svg viewBox="0 0 24 24" fill="none" stroke="#0D7C72" strokeWidth="2.6"
                  strokeLinecap="round" strokeLinejoin="round" width="42" height="42" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" className="login-check-path" />
                </svg>
              </div>
              <div>
                <h2
                  className="text-[26px] font-semibold tracking-tight leading-tight"
                  style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}
                >
                  {t('youreIn')}
                </h2>
                <p className="text-[15px] text-[#46535F] mt-2">{t('redirecting')}</p>
              </div>
            </div>
          )}

          {/* ── Step: Enter ───────────────────────────────────────────── */}
          {step === 'enter' && (
            <div key="enter" className="login-step-in">
              <h2
                className="text-[26px] font-semibold tracking-tight leading-snug"
                style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}
              >
                {t('headline')}
              </h2>
              <p className="text-[15px] text-[#46535F] mt-2 leading-relaxed">{t('subheadline')}</p>

              {/* Method toggle */}
              <div
                className="relative grid grid-cols-2 gap-[3px] p-1 rounded-[13px] mt-6 mb-[22px]"
                style={{ background: '#EFF3F6', border: '1px solid #E9EEF3' }}
              >
                <div
                  className="absolute top-1 bottom-1 start-1 w-[calc(50%-4px)] bg-white rounded-[10px] transition-transform duration-[340ms]"
                  style={{
                    transform: pillTranslate,
                    boxShadow: '0 1px 3px rgba(12,21,33,.1), 0 1px 1px rgba(12,21,33,.06)',
                  }}
                  aria-hidden="true"
                />
                {(['otp', 'password'] as Mode[]).map(m => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    className={`relative z-10 py-[11px] rounded-[10px] text-[14px] font-semibold transition-colors duration-200 ${
                      mode === m ? 'text-[#0C1521]' : 'text-[#7A8794] hover:text-[#46535F]'
                    }`}
                  >
                    {m === 'otp' ? t('modeOtp') : t('modePassword')}
                  </button>
                ))}
              </div>

              {/* OTP send form */}
              {mode === 'otp' && (
                <form action={sendAction} className="flex flex-col gap-4">
                  <LoginPhoneInput label={t('phone')} placeholder={t('phonePlaceholder')} />

                  {sendError && (
                    <p role="alert" className="text-[13px] font-semibold text-[#DC4747]">
                      {t(`errors.${sendError}` as Parameters<typeof t>[0])}
                    </p>
                  )}

                  <button
                    type="submit"
                    name="channel"
                    value="whatsapp"
                    disabled={sendPending}
                    className={`${BTN_BASE} group`}
                    style={BTN_TEAL_STYLE}
                  >
                    {sendPending
                      ? <><Spinner />{t('sendingCode')}</>
                      : <>{t('sendCode')}<ArrowIcon rtl={isRtl} /></>
                    }
                  </button>
                </form>
              )}

              {/* Password form */}
              {mode === 'password' && (
                <form action={passAction} className="flex flex-col gap-4">
                  <input type="hidden" name="locale"       value={locale} />
                  <input type="hidden" name="country_code" value="+249" />

                  <LoginPhoneInput label={t('phone')} placeholder={t('phonePlaceholder')} />
                  <LoginPasswordInput label={t('password')} placeholder={t('passwordPlaceholder')} />

                  {/* Remember + forgot */}
                  <div className="flex items-center justify-between -mt-1">
                    <RememberCheckbox label={t('keepSignedIn')} />
                    <a
                      href="#"
                      className="text-[13.5px] font-semibold text-[#0D7C72] hover:text-[#0A5C55] transition-colors"
                    >
                      {t('forgotPassword')}
                    </a>
                  </div>

                  {passState?.error && (
                    <p role="alert" className="text-[13px] font-semibold text-[#DC4747]">
                      {t(`errors.${passState.error}` as Parameters<typeof t>[0])}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={passPending}
                    className={`${BTN_BASE} group mt-1`}
                    style={BTN_TEAL_STYLE}
                  >
                    {passPending
                      ? <><Spinner />{t('loggingIn')}</>
                      : <>{t('submit')}<ArrowIcon rtl={isRtl} /></>
                    }
                  </button>
                </form>
              )}

              <p className="mt-6 text-center text-[13px] text-[#7A8794]">
                {t('newToAmana')}{' '}
                <a
                  href="#"
                  className="font-semibold text-[#46535F] hover:text-[#0D7C72] transition-colors"
                >
                  {t('talkToSales')} →
                </a>
              </p>
            </div>
          )}

          {/* ── Step: OTP verify ──────────────────────────────────────── */}
          {step === 'otp' && (
            <div key="otp" className="login-step-in">
              {/* Back button */}
              <button
                type="button"
                onClick={() => { setStep('enter'); setOtpError(false); }}
                className="inline-flex items-center gap-[7px] text-[13.5px] font-semibold text-[#7A8794] hover:text-[#0C1521] transition-colors mb-[18px]"
              >
                <BackIcon rtl={isRtl} />
                {t('back')}
              </button>

              <h2
                className="text-[26px] font-semibold tracking-tight leading-snug"
                style={{ fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif' }}
              >
                {t('enterYourCode')}
              </h2>
              <p className="text-[15px] text-[#46535F] mt-2 leading-relaxed">{t('codeSentLead')}</p>

              {/* Sent-to chip */}
              <div
                className="flex items-center gap-3 rounded-[14px] border border-[#CCEFE9] my-[22px]"
                style={{ padding: '14px 16px', background: '#F0FDFA' }}
              >
                <div
                  className="w-[38px] h-[38px] rounded-[11px] bg-white flex items-center justify-center shrink-0"
                  style={{ boxShadow: '0 1px 3px rgba(13,124,114,.18)' }}
                >
                  <PhoneChipIcon />
                </div>
                <div className="min-w-0">
                  <div className="text-[12px] font-semibold text-[#064E47] tracking-[.02em]">
                    {t('codeSentChip')}
                  </div>
                  <div
                    className="font-semibold text-[16px] text-[#064E47] mt-px"
                    dir="ltr"
                    style={{
                      fontFamily: 'var(--font-space-grotesk), system-ui, sans-serif',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {formatPhone(sentPhone)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => { setStep('enter'); setOtpError(false); }}
                  className="ms-auto text-[12.5px] font-semibold text-[#0D7C72] hover:text-[#0A5C55] transition-colors whitespace-nowrap shrink-0"
                >
                  {t('change')}
                </button>
              </div>

              {/* 6-box OTP */}
              <OtpInputGroup
                key={otpKey}
                onComplete={handleOtpComplete}
                onErrorReset={() => setOtpError(false)}
                error={otpError}
                errorMessage={
                  verifyState?.error
                    ? t(`errors.${verifyState.error}` as Parameters<typeof t>[0])
                    : ''
                }
                disabled={verifyPending}
              />

              {/* Verify button */}
              <button
                type="button"
                disabled={verifyPending}
                onClick={() => {
                  /* auto-submit fires from OtpInputGroup onComplete — this button is a visual anchor */
                }}
                className={`${BTN_BASE} mt-4`}
                style={BTN_TEAL_STYLE}
              >
                {verifyPending
                  ? <><Spinner />{t('verifyingCode')}</>
                  : t('verifyCode')
                }
              </button>

              {/* Resend */}
              <div className="flex items-center justify-center gap-1.5 mt-5 text-[13.5px] text-[#7A8794]">
                <span>{t('didntGetIt')}</span>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={resendSecs > 0 || sendPending}
                  className={`font-bold transition-colors disabled:cursor-default ${
                    resendSecs > 0
                      ? 'text-[#A6B0BC]'
                      : 'text-[#0D7C72] hover:text-[#0A5C55]'
                  }`}
                >
                  {resendSecs > 0
                    ? t('resendIn', { n: resendSecs })
                    : t('resendCode')
                  }
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Trust row */}
        <div className="flex items-center justify-center gap-4 mt-6 text-[12px] text-[#A6B0BC] flex-wrap">
          <span className="flex items-center gap-[6px]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#0D7C72"
              strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            {isRtl ? 'مشفّر بالكامل' : 'End-to-end encrypted'}
          </span>
          <span className="w-[3px] h-[3px] rounded-full bg-[#A6B0BC] opacity-60" aria-hidden="true" />
          <span style={{ fontVariantNumeric: 'tabular-nums' }}>
            {isRtl ? '٢٤٠٠+ تاجر' : '2,400+ merchants'}
          </span>
          <span className="w-[3px] h-[3px] rounded-full bg-[#A6B0BC] opacity-60" aria-hidden="true" />
          <span>{isRtl ? 'الخرطوم' : 'Khartoum'}</span>
        </div>
      </div>
      </div>
    </div>
  );
}
