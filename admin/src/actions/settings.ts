'use server';

import { cookies } from 'next/headers';
import { revalidatePath, revalidateTag } from 'next/cache';
import { CACHE_TAGS } from '@/lib/cacheTags';
import { extractApiError } from '@/lib/action-error';
import { devFetch } from '@/lib/dev-logger';
import type { Business } from '@/types/api';

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

export type UpdateTaxSettingsState =
  | { success: true; data: Business }
  | { error: string }
  | null;

export type UpdateBusinessProfileState =
  | { success: true; data: Business }
  | { error: string }
  | null;

// ── Update tax settings ──────────────────────────────────────────────────────

export async function updateTaxSettingsAction(
  _prev: UpdateTaxSettingsState,
  formData: FormData,
): Promise<UpdateTaxSettingsState> {
  const businessId   = (formData.get('business_id') as string)?.trim();
  const taxEnabled   = formData.get('tax_enabled') === 'true';
  const taxName      = (formData.get('tax_name') as string)?.trim();
  const taxRateRaw   = (formData.get('tax_rate') as string)?.trim();
  const taxInclusive = formData.get('tax_inclusive') === 'true';

  if (!businessId) return { error: 'Business not found.' };
  if (!taxName)    return { error: 'Tax name is required.' };

  const taxRate = Number(taxRateRaw);
  if (Number.isNaN(taxRate) || taxRate < 0 || taxRate > 100) {
    return { error: 'Tax rate must be between 0 and 100.' };
  }

  const body = {
    tax_enabled:   taxEnabled,
    tax_name:      taxName,
    tax_rate:      taxRate.toFixed(2),
    tax_inclusive: taxInclusive,
  };

  try {
    const res = await devFetch(`${API()}/api/v1/tenants/businesses/${businessId}/`, {
      method:  'PATCH',
      headers: authHeaders(await authToken()),
      body:    JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { error: extractApiError(data, res.status, 'Failed to save tax settings.') };
    }

    revalidateTag(CACHE_TAGS.businesses);
    revalidatePath('/[locale]/(dashboard)/settings', 'page');

    return { success: true, data: data?.data as Business };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

// ── Update business profile (name, contact info, logo) ─────────────────────────

export async function updateBusinessProfileAction(
  _prev: UpdateBusinessProfileState,
  formData: FormData,
): Promise<UpdateBusinessProfileState> {
  const businessId = (formData.get('business_id') as string)?.trim();
  const name       = (formData.get('name') as string)?.trim();
  const email      = (formData.get('email') as string)?.trim() ?? '';
  const address    = (formData.get('address') as string)?.trim() ?? '';
  const logo       = formData.get('logo') as File | null;

  if (!businessId) return { error: 'Business not found.' };
  if (!name)       return { error: 'Business name is required.' };

  const body = new FormData();
  body.set('name', name);
  body.set('email', email);
  body.set('address', address);
  if (logo && logo.size > 0) body.set('logo', logo);

  try {
    const res = await devFetch(`${API()}/api/v1/tenants/businesses/${businessId}/`, {
      method:  'PATCH',
      headers: { Authorization: `Bearer ${await authToken()}` },
      body,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      return { error: extractApiError(data, res.status, 'Failed to save business profile.') };
    }

    revalidateTag(CACHE_TAGS.businesses);
    revalidatePath('/[locale]/(dashboard)/settings', 'page');

    return { success: true, data: data?.data as Business };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}
