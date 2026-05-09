'use server';

import { cache } from 'react';
import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { extractApiError } from '@/lib/action-error';
import type { ApiResponse, StaffUser } from '@/types/api';

const API = () =>
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api.amanapos.com';

async function authToken(): Promise<string> {
  return (await cookies()).get('auth_token')?.value ?? '';
}

// React.cache deduplicates within a single request — StaffStats and StaffTable
// both call fetchStaffAction but only ONE network request goes out per render.
const getRawStaffList = cache(async (): Promise<StaffUser[]> => {
  const res = await fetch(`${API()}/api/v1/users/`, {
    headers: { Authorization: `Bearer ${await authToken()}` },
    cache: 'no-store',
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(extractApiError(json, res.status));
  return (json as ApiResponse<StaffUser[]>).data ?? [];
});

// ── Result types ──────────────────────────────────────────────────────────────

export type ActionState<T = void> =
  | (T extends void ? { success: true } : { success: true; data: T })
  | { error: string }
  | null;

export type StaffListResult =
  | { ok: true; data: StaffUser[]; count: number; total_pages: number }
  | { ok: false; error: string };

export type StaffActionState = ActionState;

// ── Fetch staff (client-side filtering — backend returns flat list) ────────────

export async function fetchStaffAction(params?: {
  search?: string;
  status?: 'active' | 'inactive';
  role?:   'owner' | 'manager' | 'cashier';
  page?:   number;
  limit?:  number;
}): Promise<StaffListResult> {
  try {
    let all: StaffUser[] = await getRawStaffList();

    if (params?.search) {
      const q = params.search.toLowerCase();
      all = all.filter(u =>
        u.full_name.toLowerCase().includes(q) || u.phone.includes(q),
      );
    }
    if (params?.status === 'active')   all = all.filter(u =>  u.is_active);
    if (params?.status === 'inactive') all = all.filter(u => !u.is_active);
    if (params?.role)                  all = all.filter(u =>  u.role === params.role);

    const limit      = params?.limit ?? 25;
    const page       = params?.page  ?? 1;
    const count      = all.length;
    const total_pages = Math.max(1, Math.ceil(count / limit));
    const data       = all.slice((page - 1) * limit, page * limit);

    return { ok: true, data, count, total_pages };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}

// ── Create staff ──────────────────────────────────────────────────────────────

export async function createStaffAction(
  _prev: StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const phoneLocal  = (formData.get('phone_local')     as string)?.trim();
  const countryCode = (formData.get('country_code')    as string) || '+249';
  const full_name   = (formData.get('full_name')        as string)?.trim();
  const role        = (formData.get('role')             as string)?.trim();
  const shopId      = (formData.get('default_shop_id') as string)?.trim() || null;

  if (!phoneLocal) return { error: 'Phone number is required.' };
  if (!full_name)  return { error: 'Full name is required.' };
  if (!role || !['manager', 'cashier'].includes(role)) return { error: 'Please select a valid role.' };

  const phone = `${countryCode}${phoneLocal.replace(/^0+/, '')}`;

  try {
    const res = await fetch(`${API()}/api/v1/users/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ phone, full_name, role, ...(shopId ? { default_shop_id: shopId } : {}) }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to add staff member.') };
    revalidatePath('/[locale]/(dashboard)/users', 'page');
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

// ── Update staff ──────────────────────────────────────────────────────────────

export async function updateStaffAction(
  userId: string,
  _prev:  StaffActionState,
  formData: FormData,
): Promise<StaffActionState> {
  const full_name = (formData.get('full_name') as string)?.trim();
  const role      = (formData.get('role')      as string)?.trim();

  if (!full_name) return { error: 'Full name is required.' };

  const body: Record<string, string | null> = { full_name };
  if (role && ['manager', 'cashier'].includes(role)) body.role = role;

  // default_shop_id: empty string → unassign (null); UUID string → assign
  const shopId = formData.get('default_shop_id');
  if (shopId !== null) {
    body.default_shop_id = (shopId as string) || null;
  }

  try {
    const res = await fetch(`${API()}/api/v1/users/${userId}/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to update staff member.') };
    revalidatePath('/[locale]/(dashboard)/users', 'page');
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

// ── Toggle active status ──────────────────────────────────────────────────────

export async function toggleStaffStatusAction(
  userId:   string,
  activate: boolean,
): Promise<StaffActionState> {
  try {
    const res = await fetch(`${API()}/api/v1/users/${userId}/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ is_active: activate }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to update status.') };
    revalidatePath('/[locale]/(dashboard)/users', 'page');
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}
