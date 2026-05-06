'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { AdminOwner, AdminOwnerDetail, AdminPlan, AdminSubscriptionDetail } from '@/types/api';
import { extractApiError } from '@/lib/action-error';

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

export type CreateSubscriptionState =
  | { success: true; subscription_id: string }
  | { error: string }
  | null;

export type UpdateSubscriptionState =
  | { success: true }
  | { error: string }
  | null;

export type DeactivateSubscriptionState =
  | { success: true }
  | { error: string }
  | null;

export type SubscriptionDetailResult =
  | { ok: true;  data: AdminSubscriptionDetail }
  | { ok: false; error: string; status?: number };

// ── Owner search (for subscription create flow) ───────────────────────────────

export type OwnerSearchResult =
  | { ok: true;  data: AdminOwner[] }
  | { ok: false; error: string };

export async function searchOwnersAction(query: string): Promise<OwnerSearchResult> {
  if (!query.trim()) return { ok: true, data: [] };
  try {
    const url = new URL(`${API()}/api/v1/admin/owners/`);
    url.searchParams.set('search', query.trim());
    url.searchParams.set('page_size', '8');
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${await authToken()}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    return { ok: true, data: json?.data?.results ?? [] };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

export type OwnerDetailResult =
  | { ok: true;  data: AdminOwnerDetail }
  | { ok: false; error: string };

export async function fetchOwnerDetailAction(id: string): Promise<OwnerDetailResult> {
  try {
    const res = await fetch(`${API()}/api/v1/admin/owners/${id}/`, {
      headers: { Authorization: `Bearer ${await authToken()}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    if (!json?.data) return { ok: false, error: 'Unexpected response format' };
    return { ok: true, data: json.data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// ── Fetch plans (for client components — avoids next/headers restriction) ─────

export type PlansResult =
  | { ok: true;  data: AdminPlan[] }
  | { ok: false; error: string };

export async function fetchPlansAction(): Promise<PlansResult> {
  try {
    const res = await fetch(`${API()}/api/v1/admin/plans/`, {
      headers: { Authorization: `Bearer ${await authToken()}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status) };
    if (!Array.isArray(json?.data)) return { ok: false, error: 'Unexpected response format' };
    return { ok: true, data: json.data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// ── Fetch detail (for client components) ─────────────────────────────────────

export async function fetchSubscriptionDetailAction(id: string): Promise<SubscriptionDetailResult> {
  try {
    const res = await fetch(`${API()}/api/v1/admin/subscriptions/${id}/`, {
      headers: { Authorization: `Bearer ${await authToken()}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) return { ok: false, error: extractApiError(json, res.status), status: res.status };
    if (!json?.data) return { ok: false, error: 'Unexpected API response format' };
    return { ok: true, data: json.data };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// ── Create subscription ───────────────────────────────────────────────────────

export async function createSubscriptionAction(
  _prev: CreateSubscriptionState,
  formData: FormData,
): Promise<CreateSubscriptionState> {
  const business_id       = (formData.get('business_id') as string)?.trim();
  const plan_id           = (formData.get('plan_id') as string)?.trim();
  const start_date        = (formData.get('start_date') as string)?.trim();
  const payment_reference = (formData.get('payment_reference') as string)?.trim();
  const notes             = (formData.get('notes') as string)?.trim();

  if (!business_id) return { error: 'Business ID is required.' };
  if (!plan_id)     return { error: 'Plan is required.' };
  if (!start_date)  return { error: 'Start date is required.' };

  const body: Record<string, string> = { business_id, plan_id, start_date };
  if (payment_reference) body.payment_reference = payment_reference;
  if (notes)             body.notes             = notes;

  try {
    const res = await fetch(`${API()}/api/v1/admin/subscriptions/create/`, {
      method:  'POST',
      headers: authHeaders(await authToken()),
      body:    JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to create subscription.') };
    revalidatePath('/[locale]/(dashboard)/subscriptions', 'page');
    return { success: true, subscription_id: data?.data?.id ?? '' };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

// ── Update subscription ───────────────────────────────────────────────────────

export async function updateSubscriptionAction(
  subscriptionId: string,
  _prev: UpdateSubscriptionState,
  formData: FormData,
): Promise<UpdateSubscriptionState> {
  const payment_reference = (formData.get('payment_reference') as string)?.trim();
  const notes             = (formData.get('notes') as string)?.trim();

  try {
    const res = await fetch(`${API()}/api/v1/admin/subscriptions/${subscriptionId}/`, {
      method:  'PATCH',
      headers: authHeaders(await authToken()),
      body:    JSON.stringify({ payment_reference, notes }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to update subscription.') };
    revalidatePath('/[locale]/(dashboard)/subscriptions', 'page');
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

// ── Deactivate subscription ───────────────────────────────────────────────────

export async function deactivateSubscriptionAction(
  subscriptionId: string,
): Promise<DeactivateSubscriptionState> {
  try {
    const res = await fetch(`${API()}/api/v1/admin/subscriptions/${subscriptionId}/deactivate/`, {
      method:  'POST',
      headers: authHeaders(await authToken()),
      body:    JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to deactivate subscription.') };
    revalidatePath('/[locale]/(dashboard)/subscriptions', 'page');
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}
