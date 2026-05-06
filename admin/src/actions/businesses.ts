'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { AdminBusinessDetail } from '@/types/api';

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

export type CreateBusinessState =
  | { success: true; business_id: string }
  | { error: string }
  | null;

export type UpdateBusinessState =
  | { success: true }
  | { error: string }
  | null;

export type ToggleBusinessStatusState =
  | { success: true; is_active: boolean }
  | { error: string }
  | null;

export type BusinessDetailResult =
  | { ok: true;  data: AdminBusinessDetail }
  | { ok: false; error: string; status?: number };

// ── Create business ───────────────────────────────────────────────────────────

export async function createBusinessAction(
  _prev: CreateBusinessState,
  formData: FormData,
): Promise<CreateBusinessState> {
  const owner_phone = (formData.get('owner_phone') as string)?.trim();
  const name        = (formData.get('name') as string)?.trim();
  const address     = (formData.get('address') as string)?.trim();
  const phone       = (formData.get('phone') as string)?.trim();
  const email       = (formData.get('email') as string)?.trim();

  if (!owner_phone) return { error: 'Owner phone is required.' };
  if (!name)        return { error: 'Business name is required.' };

  const body: Record<string, string> = { owner_phone, name };
  if (address) body.address = address;
  if (phone)   body.phone   = phone;
  if (email)   body.email   = email.toLowerCase();

  try {
    const res = await fetch(`${API()}/api/v1/admin/businesses/create/`, {
      method:  'POST',
      headers: authHeaders(await authToken()),
      body:    JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      const msg =
        data?.message ||
        data?.owner_phone?.[0] ||
        data?.name?.[0] ||
        data?.non_field_errors?.[0] ||
        'Failed to create business.';
      return { error: msg };
    }

    const business_id: string = data?.data?.id ?? '';
    revalidatePath('/[locale]/(dashboard)/businesses', 'page');
    return { success: true, business_id };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

// ── Fetch business detail (for client components) ─────────────────────────────

export async function fetchBusinessDetailAction(businessId: string): Promise<BusinessDetailResult> {
  try {
    const token = await authToken();
    const url   = `${API()}/api/v1/admin/businesses/${businessId}/`;
    const res   = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    const json = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = json?.message || json?.detail || json?.error || `HTTP ${res.status}`;
      return { ok: false, error: msg, status: res.status };
    }

    if (!json?.data) {
      return { ok: false, error: 'Unexpected API response format' };
    }

    return { ok: true, data: json.data };
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    return { ok: false, error: msg };
  }
}

// ── Update business ───────────────────────────────────────────────────────────

export async function updateBusinessAction(
  businessId: string,
  _prev: UpdateBusinessState,
  formData: FormData,
): Promise<UpdateBusinessState> {
  const name    = (formData.get('name') as string)?.trim();
  const address = (formData.get('address') as string)?.trim();
  const phone   = (formData.get('phone') as string)?.trim();
  const email   = (formData.get('email') as string)?.trim();

  if (!name) return { error: 'Business name is required.' };

  const body: Record<string, string> = { name };
  if (address !== undefined) body.address = address;
  if (phone   !== undefined) body.phone   = phone;
  if (email   !== undefined) body.email   = email.toLowerCase();

  try {
    const res = await fetch(`${API()}/api/v1/admin/businesses/${businessId}/`, {
      method:  'PATCH',
      headers: authHeaders(await authToken()),
      body:    JSON.stringify(body),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      return { error: data?.message || 'Failed to update business.' };
    }

    revalidatePath('/[locale]/(dashboard)/businesses', 'page');
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

// ── Toggle business status ────────────────────────────────────────────────────

export async function toggleBusinessStatusAction(
  businessId: string,
): Promise<ToggleBusinessStatusState> {
  try {
    const res = await fetch(`${API()}/api/v1/admin/businesses/${businessId}/toggle-status/`, {
      method:  'POST',
      headers: authHeaders(await authToken()),
      body:    JSON.stringify({}),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: data?.message || 'Failed to update status.' };

    revalidatePath('/[locale]/(dashboard)/businesses', 'page');
    return { success: true, is_active: data?.data?.is_active ?? false };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}
