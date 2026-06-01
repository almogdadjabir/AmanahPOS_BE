import { apiGet, ApiError } from '@/lib/api';
import type { ApiResponse, SystemOverview } from '@/types/api';

export async function fetchSystemOverview(): Promise<SystemOverview | null> {
  try {
    const res = await apiGet<ApiResponse<SystemOverview>>('/api/v1/admin/system/overview/');
    return res?.data ?? null;
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) throw e;
    return null;
  }
}
