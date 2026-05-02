'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import type { AdminOwnerDetail } from '@/types/api';

const API = () =>
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api.amanapos.com';

async function authToken(): Promise<string> {
  return (await cookies()).get('auth_token')?.value ?? '';
}

function authHeaders(token: string) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

// ── Types ─────────────────────────────────────────────────────────────────────

export type CreateOwnerState =
  | { success: true; owner_id: string; phone: string }
  | { error: string }
  | null;

export type UpdateOwnerState =
  | { success: true }
  | { error: string }
  | null;

export type ToggleStatusState =
  | { success: true; is_active: boolean }
  | { error: string }
  | null;

// ── Create owner ──────────────────────────────────────────────────────────────

export async function createOwnerAction(
  _prev: CreateOwnerState,
  formData: FormData,
): Promise<CreateOwnerState> {
  const full_name    = (formData.get('full_name') as string)?.trim();
  const phone_local  = (formData.get('phone_local') as string)?.trim().replace(/^0+/, '');
  const country_code = (formData.get('country_code') as string) || '+249';
  const email        = (formData.get('email') as string)?.trim();
  const locale       = (formData.get('locale') as string) || 'ar';

  if (!full_name)   return { error: 'Full name is required.' };
  if (!phone_local) return { error: 'Phone number is required.' };

  const phone = `${country_code}${phone_local}`;
  const body: Record<string, string> = { full_name, phone };
  if (email) body.email = email.toLowerCase();

  try {
    const res = await fetch(`${API()}/api/v1/auth/register/`, {
      method:  'POST',
      headers: authHeaders(await authToken()),
      body:    JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        data?.message ||
        data?.phone?.[0] ||
        data?.full_name?.[0] ||
        data?.email?.[0] ||
        'Failed to create owner.';
      return { error: msg };
    }

    const owner_id: string = data?.data?.user_id ?? '';
    const owner_phone: string = data?.data?.phone ?? phone;

    revalidatePath('/[locale]/(dashboard)/owners', 'page');

    const mode = (formData.get('mode') as string) || '';
    if (mode === 'drawer') {
      return { success: true, owner_id, phone: owner_phone };
    }
    redirect(`/${locale}/owners/${owner_id}`);
  } catch (e) {
    if (e instanceof Error && e.message === 'NEXT_REDIRECT') throw e;
    return { error: 'Network error. Please try again.' };
  }
}

// ── Update owner ──────────────────────────────────────────────────────────────

export async function updateOwnerAction(
  ownerId: string,
  _prev: UpdateOwnerState,
  formData: FormData,
): Promise<UpdateOwnerState> {
  const full_name = (formData.get('full_name') as string)?.trim();
  const email     = (formData.get('email') as string)?.trim();

  if (!full_name) return { error: 'Full name is required.' };

  const body: Record<string, string> = { full_name };
  if (email) body.email = email.toLowerCase();

  try {
    const res = await fetch(`${API()}/api/v1/admin/owners/${ownerId}/`, {
      method:  'PATCH',
      headers: authHeaders(await authToken()),
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data?.message || 'Failed to update owner.' };
    }

    revalidatePath(`/[locale]/(dashboard)/owners/${ownerId}`, 'page');
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

// ── Fetch owner detail (for client components) ────────────────────────────────

export type OwnerDetailResult =
  | { ok: true;  data: AdminOwnerDetail }
  | { ok: false; error: string; status?: number };

export async function fetchOwnerDetailAction(ownerId: string): Promise<OwnerDetailResult> {
  try {
    const token = await authToken();
    const url   = `${API()}/api/v1/admin/owners/${ownerId}/`;
    const res   = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = json?.message || json?.detail || json?.error || `HTTP ${res.status}`;
      console.error(`[fetchOwnerDetail] ${res.status} ${url}`, json);
      return { ok: false, error: msg, status: res.status };
    }

    if (!json?.data) {
      console.error(`[fetchOwnerDetail] unexpected response shape`, json);
      return { ok: false, error: 'Unexpected API response format' };
    }

    return { ok: true, data: json.data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    console.error(`[fetchOwnerDetail] exception:`, msg);
    return { ok: false, error: msg };
  }
}

// ── Toggle status ─────────────────────────────────────────────────────────────

export async function toggleOwnerStatusAction(
  ownerId: string,
): Promise<ToggleStatusState> {
  try {
    const res = await fetch(`${API()}/api/v1/admin/owners/${ownerId}/toggle-status/`, {
      method:  'POST',
      headers: authHeaders(await authToken()),
      body:    JSON.stringify({}),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data?.message || 'Failed to update status.' };

    revalidatePath(`/[locale]/(dashboard)/owners/${ownerId}`, 'page');
    revalidatePath('/[locale]/(dashboard)/owners', 'page');
    return { success: true, is_active: data?.data?.is_active ?? false };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}
