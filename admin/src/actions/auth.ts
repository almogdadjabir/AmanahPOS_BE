'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

export type LoginState    = { error: 'invalid_credentials' | 'network_error' | 'required' | 'too_many_attempts' | 'no_password' | string } | null;
export type OtpSendState  = { error: string } | { sent: true; phone: string } | null;
export type OtpVerifyState = { error: string } | null;

const API = () =>
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api.amanapos.com';

function buildPhone(local: string, code: string) {
  return `${code}${local.replace(/^0+/, '')}`;
}

async function setAuthCookie(token: string) {
  (await cookies()).set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  });
}

// ── Password login ────────────────────────────────────────────────────────────

export async function loginAction(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const phoneLocal  = (formData.get('phone_local') as string)?.trim();
  const countryCode = (formData.get('country_code') as string) || '+249';
  const password    = (formData.get('password') as string)?.trim();
  const locale      = (formData.get('locale') as string) || 'ar';

  if (!phoneLocal || !password) return { error: 'required' };

  try {
    const res = await fetch(`${API()}/api-public/v1/auth/login/password/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: buildPhone(phoneLocal, countryCode), password }),
    });

    if (!res.ok) {
      if (res.status === 429) return { error: 'too_many_attempts' };
      const errBody = await res.json().catch(() => ({}));
      const msg: string = errBody?.error?.message ?? errBody?.detail ?? '';
      if (msg.toLowerCase().includes('password set')) return { error: 'no_password' };
      return { error: 'invalid_credentials' };
    }

    const data = await res.json();
    const token: string = data?.data?.access ?? data?.access ?? '';
    if (!token) return { error: 'invalid_credentials' };

    await setAuthCookie(token);
  } catch {
    return { error: 'network_error' };
  }

  redirect(`/${locale}`);
}

// ── OTP step 1 — request code ─────────────────────────────────────────────────

export async function requestOtpAction(_prev: OtpSendState, formData: FormData): Promise<OtpSendState> {
  const phoneLocal  = (formData.get('phone_local') as string)?.trim();
  const countryCode = (formData.get('country_code') as string) || '+249';

  if (!phoneLocal) return { error: 'required' };

  const phone = buildPhone(phoneLocal, countryCode);

  try {
    const res = await fetch(`${API()}/api-public/v1/auth/login/otp/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone }),
    });

    if (!res.ok) return { error: 'otp_send_failed' };
    return { sent: true, phone };
  } catch {
    return { error: 'network_error' };
  }
}

// ── OTP step 2 — verify code ──────────────────────────────────────────────────

export async function verifyOtpAction(_prev: OtpVerifyState, formData: FormData): Promise<OtpVerifyState> {
  const phone  = (formData.get('phone') as string)?.trim();
  const otp    = (formData.get('otp') as string)?.trim();
  const locale = (formData.get('locale') as string) || 'ar';

  if (!phone || !otp) return { error: 'required' };

  try {
    const res = await fetch(`${API()}/api-public/v1/auth/login/otp/verify/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, otp }),
    });

    if (!res.ok) return { error: 'otp_invalid' };

    const data = await res.json();
    const token: string = data?.data?.access ?? data?.access ?? '';
    if (!token) return { error: 'otp_invalid' };

    await setAuthCookie(token);
  } catch {
    return { error: 'network_error' };
  }

  redirect(`/${locale}`);
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logoutAction() {
  (await cookies()).delete('auth_token');
  redirect('/ar/login');
}
