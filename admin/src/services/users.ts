import { apiGet, apiPatch, ApiError } from '@/lib/api';
import type { ApiResponse, StaffUser, UserRole } from '@/types/api';

export type { StaffUser };

export interface GetUsersParams {
  search?:  string;
  status?:  'active' | 'inactive' | 'all';
  role?:    UserRole | 'all';
  page?:    number;
  pageSize?: number;
}

export interface PaginatedStaff {
  users:       StaffUser[];
  total:       number;
  page:        number;
  total_pages: number;
}

export async function getUsers(params: GetUsersParams = {}): Promise<PaginatedStaff> {
  const { page = 1, pageSize = 10 } = params;

  try {
    const res = await apiGet<ApiResponse<StaffUser[]>>('/api/v1/users/');
    let all = res.data ?? [];

    // Client-side filtering (backend returns flat list without pagination)
    if (params.search) {
      const q = params.search.toLowerCase();
      all = all.filter(u =>
        u.full_name.toLowerCase().includes(q) ||
        u.phone.includes(q),
      );
    }
    if (params.status && params.status !== 'all') {
      const active = params.status === 'active';
      all = all.filter(u => u.is_active === active);
    }
    if (params.role && params.role !== 'all') {
      all = all.filter(u => u.role === params.role);
    }

    const total = all.length;
    const slice = all.slice((page - 1) * pageSize, page * pageSize);

    return { users: slice, total, page, total_pages: Math.max(1, Math.ceil(total / pageSize)) };
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) throw e;
    return { users: [], total: 0, page: 1, total_pages: 1 };
  }
}

export async function toggleUserStatus(id: string, currentlyActive: boolean): Promise<void> {
  await apiPatch<ApiResponse<StaffUser>>(`/api/v1/users/${id}/`, {
    is_active: !currentlyActive,
  });
}

// Exported for overview page
export async function fetchStaffList(): Promise<StaffUser[]> {
  try {
    const res = await apiGet<ApiResponse<StaffUser[]>>('/api/v1/users/');
    return res.data ?? [];
  } catch {
    return [];
  }
}
