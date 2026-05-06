'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import type { AdminPlan } from '@/types/api';
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

export type PlanDetailResult =
  | { ok: true;  data: AdminPlan }
  | { ok: false; error: string; status?: number };

export type CreatePlanState =
  | { success: true; plan_id: string }
  | { error: string }
  | null;

export type UpdatePlanState =
  | { success: true }
  | { error: string }
  | null;

export type TogglePlanState =
  | { success: true; is_active: boolean }
  | { error: string }
  | null;

// ── Fetch plans list (for client components) ──────────────────────────────────

export type PlansListResult =
  | { ok: true;  data: AdminPlan[] }
  | { ok: false; error: string };

export async function fetchPlansListAction(): Promise<PlansListResult> {
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

// ── Fetch plan detail (for client components) ─────────────────────────────────

export async function fetchPlanDetailAction(id: string): Promise<PlanDetailResult> {
  try {
    const res = await fetch(`${API()}/api/v1/admin/plans/${id}/`, {
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

// ── Create plan ───────────────────────────────────────────────────────────────

export async function createPlanAction(
  _prev: CreatePlanState,
  formData: FormData,
): Promise<CreatePlanState> {
  const name          = (formData.get('name')          as string)?.trim();
  const description   = (formData.get('description')   as string)?.trim();
  const price         = (formData.get('price')         as string)?.trim();
  const currency      = (formData.get('currency')      as string)?.trim() || 'SDG';
  const max_shops     = formData.get('max_shops');
  const max_products  = formData.get('max_products');
  const max_users     = formData.get('max_users');
  const duration_days = formData.get('duration_days');
  const sort_order    = formData.get('sort_order');
  const featuresRaw   = (formData.get('features') as string)?.trim();

  if (!name)  return { error: 'Plan name is required.' };
  if (!price) return { error: 'Price is required.' };
  if (isNaN(parseFloat(price)) || parseFloat(price) <= 0)
    return { error: 'Price must be a positive number.' };

  let features: Record<string, unknown> = {};
  if (featuresRaw) {
    try { features = JSON.parse(featuresRaw); }
    catch { return { error: 'Features must be valid JSON.' }; }
  }

  const body: Record<string, unknown> = {
    name,
    price,
    currency,
    features,
    is_active: true,
  };
  if (description)   body.description   = description;
  if (max_shops)     body.max_shops     = parseInt(max_shops    as string, 10);
  if (max_products)  body.max_products  = parseInt(max_products as string, 10);
  if (max_users)     body.max_users     = parseInt(max_users    as string, 10);
  if (duration_days) body.duration_days = parseInt(duration_days as string, 10);
  if (sort_order)    body.sort_order    = parseInt(sort_order   as string, 10);

  try {
    const res = await fetch(`${API()}/api/v1/admin/plans/create/`, {
      method:  'POST',
      headers: authHeaders(await authToken()),
      body:    JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to create plan.') };
    revalidatePath('/[locale]/(dashboard)/plans', 'page');
    return { success: true, plan_id: data?.data?.id ?? '' };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

// ── Update plan ───────────────────────────────────────────────────────────────

export async function updatePlanAction(
  planId: string,
  _prev: UpdatePlanState,
  formData: FormData,
): Promise<UpdatePlanState> {
  const name          = (formData.get('name')         as string)?.trim();
  const description   = (formData.get('description')  as string)?.trim();
  const price         = (formData.get('price')        as string)?.trim();
  const currency      = (formData.get('currency')     as string)?.trim();
  const max_shops     = formData.get('max_shops');
  const max_products  = formData.get('max_products');
  const max_users     = formData.get('max_users');
  const duration_days = formData.get('duration_days');
  const sort_order    = formData.get('sort_order');
  const featuresRaw   = (formData.get('features')     as string)?.trim();

  if (!name)  return { error: 'Plan name is required.' };
  if (!price) return { error: 'Price is required.' };
  if (isNaN(parseFloat(price)) || parseFloat(price) <= 0)
    return { error: 'Price must be a positive number.' };

  let features: Record<string, unknown> | undefined;
  if (featuresRaw) {
    try { features = JSON.parse(featuresRaw); }
    catch { return { error: 'Features must be valid JSON.' }; }
  }

  const body: Record<string, unknown> = { name, price };
  if (currency)                         body.currency      = currency;
  if (description !== undefined)        body.description   = description;
  if (max_shops)     body.max_shops     = parseInt(max_shops    as string, 10);
  if (max_products)  body.max_products  = parseInt(max_products as string, 10);
  if (max_users)     body.max_users     = parseInt(max_users    as string, 10);
  if (duration_days) body.duration_days = parseInt(duration_days as string, 10);
  if (sort_order)    body.sort_order    = parseInt(sort_order   as string, 10);
  if (features)      body.features      = features;

  try {
    const res = await fetch(`${API()}/api/v1/admin/plans/${planId}/`, {
      method:  'PATCH',
      headers: authHeaders(await authToken()),
      body:    JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to update plan.') };
    revalidatePath('/[locale]/(dashboard)/plans', 'page');
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

// ── Toggle plan active ────────────────────────────────────────────────────────

export async function togglePlanActiveAction(planId: string): Promise<TogglePlanState> {
  try {
    const res = await fetch(`${API()}/api/v1/admin/plans/${planId}/toggle-active/`, {
      method:  'POST',
      headers: authHeaders(await authToken()),
      body:    JSON.stringify({}),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to update plan status.') };
    revalidatePath('/[locale]/(dashboard)/plans', 'page');
    return { success: true, is_active: data?.data?.is_active ?? false };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}
