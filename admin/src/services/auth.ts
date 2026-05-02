import { cache } from 'react';
import { apiGet, ApiError } from '@/lib/api';
import type { ApiResponse, UserProfile } from '@/types/api';
import { redirect } from 'next/navigation';

export const getCurrentUser = cache(async (): Promise<UserProfile> => {
  try {
    const res = await apiGet<ApiResponse<UserProfile>>('/api/v1/auth/profile/');
    return res.data;
  } catch (e) {
    if (e instanceof ApiError && (e.status === 401 || e.status === 403)) {
      redirect('/api/auth/clear-session');
    }
    throw e;
  }
});

export function isPlatformAdmin(user: UserProfile): boolean {
  return user.is_staff === true;
}

export function isBusinessOwner(user: UserProfile): boolean {
  return !user.is_staff && user.role === 'owner';
}
