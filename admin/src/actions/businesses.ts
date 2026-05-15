'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { AdminBusinessDetail } from '@/types/api';
import { extractApiError } from '@/lib/action-error';
import { devFetch, logFormData } from '@/lib/dev-logger';

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
  // Logs raw FormData keys to confirm whether Next.js strips the "1_" prefix
  // before the action runs (it should). No-op in production.
  logFormData(formData, 'createBusinessAction — FormData');

  const owner_id       = (formData.get('owner_id')       as string)?.trim();
  const name           = (formData.get('name')           as string)?.trim();
  const address        = (formData.get('address')        as string)?.trim();
  const phone          = (formData.get('phone')          as string)?.trim();
  const email          = (formData.get('email')          as string)?.trim();
  const business_type  = (formData.get('business_type')  as string)?.trim() || 'shop';

  if (!owner_id) return { error: 'Owner is required.' };
  if (!name)     return { error: 'Business name is required.' };

  const body: Record<string, string> = { owner_id, name, business_type };
  if (address) body.address = address;
  if (phone)   body.phone   = phone;
  if (email)   body.email   = email.toLowerCase();

  try {
    const res = await devFetch(`${API()}/api/v1/admin/businesses/create/`, {
      method:  'POST',
      headers: authHeaders(await authToken()),
      body:    JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { error: extractApiError(data, res.status, 'Failed to create business.') };
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
    const res   = await devFetch(url, {
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
    const res = await devFetch(`${API()}/api/v1/admin/businesses/${businessId}/`, {
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
    const res = await devFetch(`${API()}/api/v1/admin/businesses/${businessId}/toggle-status/`, {
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

// ── Premium feature management ────────────────────────────────────────────────

export type FeaturesResult =
  | { ok: true; features: Record<string, boolean> }
  | { ok: false; error: string };

export async function fetchBusinessFeaturesAction(planId: string): Promise<FeaturesResult> {
  try {
    const res = await devFetch(`${API()}/api/v1/admin/plans/${planId}/`, {
      headers: { Authorization: `Bearer ${await authToken()}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    const raw: Record<string, unknown> = (json?.data?.features) ?? {};
    return {
      ok: true,
      features: Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Boolean(v)])),
    };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export type UpdateFeatureState =
  | { success: true }
  | { error: string }
  | null;

export async function updateBusinessFeatureAction(
  planId:     string,
  featureKey: string,
  enabled:    boolean,
): Promise<UpdateFeatureState> {
  const current = await fetchBusinessFeaturesAction(planId);
  if (!current.ok) return { error: current.error };

  const updated = { ...current.features, [featureKey]: enabled };

  try {
    const res = await devFetch(`${API()}/api/v1/admin/plans/${planId}/`, {
      method:  'PATCH',
      headers: authHeaders(await authToken()),
      body:    JSON.stringify({ features: updated }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to update feature.') };
    revalidatePath('/[locale]/(dashboard)/businesses', 'page');
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}
