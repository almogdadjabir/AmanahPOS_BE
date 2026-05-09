'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { extractApiError } from '@/lib/action-error';
import type { ApiList, Customer } from '@/types/api';

const API = () =>
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api.amanapos.com';

async function authToken(): Promise<string> {
  return (await cookies()).get('auth_token')?.value ?? '';
}

// ── Result types ──────────────────────────────────────────────────────────────

export type ActionState<T = void> =
  | (T extends void ? { success: true } : { success: true; data: T })
  | { error: string }
  | null;

export type CustomerListResult =
  | { ok: true; data: Customer[]; count: number; total_pages: number }
  | { ok: false; error: string };

export type CustomerActionState = ActionState;

// ── Fetch customers ───────────────────────────────────────────────────────────

export async function fetchCustomersAction(params?: {
  search?: string;
  status?: 'active' | 'inactive';
  page?:   number;
  limit?:  number;
}): Promise<CustomerListResult> {
  try {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.status === 'active')   qs.set('is_active', 'true');
    if (params?.status === 'inactive') qs.set('is_active', 'false');
    if (params?.page)  qs.set('page',  String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit ?? 25));

    const url = `${API()}/api/v1/customers/${qs.toString() ? `?${qs}` : ''}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${await authToken()}` },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };

    const list        = json as ApiList<Customer>;
    const data        = list.results ?? [];
    const count       = list.count   ?? data.length;
    const total_pages = list.total_pages ?? Math.max(1, Math.ceil(count / (params?.limit ?? 25)));

    return { ok: true, data, count, total_pages };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// ── Create customer ───────────────────────────────────────────────────────────

export async function createCustomerAction(
  _prev: CustomerActionState,
  formData: FormData,
): Promise<CustomerActionState> {
  const name        = (formData.get('name')         as string)?.trim();
  const phoneLocal  = (formData.get('phone_local')  as string)?.trim();
  const countryCode = (formData.get('country_code') as string) || '+249';
  const email       = (formData.get('email')        as string)?.trim();
  const address     = (formData.get('address')      as string)?.trim();
  const notes       = (formData.get('notes')        as string)?.trim();

  if (!name) return { error: 'Customer name is required.' };

  const phone = phoneLocal ? `${countryCode}${phoneLocal.replace(/^0+/, '')}` : '';

  const body: Record<string, string | null> = { name };
  if (phone)   body.phone   = phone;
  if (email)   body.email   = email;
  if (address) body.address = address;
  if (notes)   body.notes   = notes;

  try {
    const res = await fetch(`${API()}/api/v1/customers/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to add customer.') };
    revalidatePath('/[locale]/(dashboard)/customers', 'page');
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

// ── Update customer ───────────────────────────────────────────────────────────

export async function updateCustomerAction(
  customerId: string,
  _prev:      CustomerActionState,
  formData:   FormData,
): Promise<CustomerActionState> {
  const name        = (formData.get('name')         as string)?.trim();
  const phoneLocal  = (formData.get('phone_local')  as string)?.trim();
  const countryCode = (formData.get('country_code') as string) || '+249';
  const email       = (formData.get('email')        as string)?.trim();
  const address     = (formData.get('address')      as string)?.trim();
  const notes       = (formData.get('notes')        as string)?.trim();

  if (!name) return { error: 'Customer name is required.' };

  const phone = phoneLocal ? `${countryCode}${phoneLocal.replace(/^0+/, '')}` : '';

  const body: Record<string, string | null> = {
    name,
    phone:   phone   || null,
    email:   email   || null,
    address: address || null,
    notes:   notes   || '',
  };

  try {
    const res = await fetch(`${API()}/api/v1/customers/${customerId}/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to update customer.') };
    revalidatePath('/[locale]/(dashboard)/customers', 'page');
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

// ── Toggle customer status ────────────────────────────────────────────────────

export async function toggleCustomerStatusAction(
  customerId: string,
  activate:   boolean,
): Promise<CustomerActionState> {
  try {
    const res = await fetch(`${API()}/api/v1/customers/${customerId}/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_active: activate }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to update status.') };
    revalidatePath('/[locale]/(dashboard)/customers', 'page');
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}
