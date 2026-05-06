'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { extractApiError } from '@/lib/action-error';
import type { UserProfile } from '@/types/api';

const API = () =>
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'https://api.amanapos.com';

async function authToken(): Promise<string> {
  return (await cookies()).get('auth_token')?.value ?? '';
}

// ── Update profile ────────────────────────────────────────────────────────────

export type UpdateProfileState =
  | { success: true; data: UserProfile }
  | { error: string }
  | null;

export async function updateProfileAction(
  _prev: UpdateProfileState,
  formData: FormData,
): Promise<UpdateProfileState> {
  const full_name = (formData.get('full_name') as string)?.trim();
  const email     = (formData.get('email') as string)?.trim();

  if (!full_name) return { error: 'Name is required.' };

  const body: Record<string, string | null> = { full_name };
  body.email = email || null;

  try {
    const res = await fetch(`${API()}/api/v1/auth/profile/`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to update profile.') };
    revalidatePath('/', 'layout');
    return { success: true, data: data.data };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

// ── Change password ───────────────────────────────────────────────────────────

export type ChangePasswordState =
  | { success: true }
  | { error: string }
  | null;

export async function changePasswordAction(
  _prev: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const current_password = (formData.get('current_password') as string)?.trim();
  const password         = (formData.get('password') as string)?.trim();
  const password_confirm = (formData.get('password_confirm') as string)?.trim();

  if (!password) return { error: 'New password is required.' };
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' };
  if (password !== password_confirm) return { error: 'Passwords do not match.' };

  const body: Record<string, string> = { password, password_confirm };
  if (current_password) body.current_password = current_password;

  try {
    const res = await fetch(`${API()}/api/v1/auth/set-password/`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await authToken()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: extractApiError(data, res.status, 'Failed to change password.') };
    return { success: true };
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}
