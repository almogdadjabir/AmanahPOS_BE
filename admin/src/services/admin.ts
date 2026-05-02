import { apiGet, apiPost, apiPatch, ApiError } from '@/lib/api';
import type { ApiResponse, Plan, AdminStats, AdminOwner, AdminOwnerDetail, AdminBusiness, AdminSubscription, AdminList } from '@/types/api';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  checks: { database: string; cache: string };
}

export interface CreateOwnerInput {
  phone: string;
  full_name: string;
  email?: string;
}

export interface CreatedOwner {
  user_id: string;
  phone: string;
  full_name: string;
  role: string;
}

export interface AdminListParams {
  page?:             number;
  page_size?:        number;
  search?:           string;
  ordering?:         string;
  is_active?:        boolean;
  has_subscription?: boolean;
  status?:           'active' | 'expired' | 'all';
}

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) throw e;
    console.error('[admin]', e instanceof Error ? e.message : e);
    return null;
  }
}

// ── Health ────────────────────────────────────────────────────────────────────

export async function fetchHealth(): Promise<HealthStatus | null> {
  return safe(() => apiGet<HealthStatus>('/api/v1/health/'));
}

// ── Plans (unchanged — used by both admin and owner) ──────────────────────────

export async function fetchPlans(): Promise<Plan[]> {
  const res = await safe(() =>
    apiGet<ApiResponse<Plan[]>>('/api/v1/subscriptions/plans/'),
  );
  return res?.data ?? [];
}

// ── Admin stats ───────────────────────────────────────────────────────────────

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await apiGet<ApiResponse<AdminStats>>('/api/v1/admin/stats/');
  return res.data;
}

// ── Admin owners list ─────────────────────────────────────────────────────────

export async function fetchAdminOwners(params?: AdminListParams): Promise<AdminList<AdminOwner>['data']> {
  const res = await apiGet<AdminList<AdminOwner>>('/api/v1/admin/owners/', params as Record<string, string>);
  return res.data;
}

// ── Admin businesses list ─────────────────────────────────────────────────────

export async function fetchAdminBusinesses(params?: AdminListParams): Promise<AdminList<AdminBusiness>['data']> {
  const res = await apiGet<AdminList<AdminBusiness>>('/api/v1/admin/businesses/', params as Record<string, string>);
  return res.data;
}

// ── Admin subscriptions list ──────────────────────────────────────────────────

export async function fetchAdminSubscriptions(params?: AdminListParams): Promise<AdminList<AdminSubscription>['data']> {
  const res = await apiGet<AdminList<AdminSubscription>>('/api/v1/admin/subscriptions/', params as Record<string, string>);
  return res.data;
}

// ── Admin owner detail ────────────────────────────────────────────────────────

export async function fetchAdminOwner(id: string): Promise<AdminOwnerDetail> {
  const res = await apiGet<ApiResponse<AdminOwnerDetail>>(`/api/v1/admin/owners/${id}/`);
  return res.data;
}

export async function updateAdminOwner(
  id: string,
  data: { full_name?: string; email?: string },
): Promise<AdminOwnerDetail> {
  const res = await apiPatch<ApiResponse<AdminOwnerDetail>>(`/api/v1/admin/owners/${id}/`, data);
  return res.data;
}

export async function toggleAdminOwnerStatus(id: string): Promise<{ id: string; is_active: boolean }> {
  const res = await apiPost<ApiResponse<{ id: string; is_active: boolean }>>(
    `/api/v1/admin/owners/${id}/toggle-status/`, {},
  );
  return res.data;
}

// ── Owner creation ────────────────────────────────────────────────────────────

export async function createOwner(input: CreateOwnerInput): Promise<CreatedOwner> {
  const res = await apiPost<ApiResponse<CreatedOwner>>('/api/v1/auth/register/', input);
  return res.data;
}

// ── Dashboard bundle ──────────────────────────────────────────────────────────

export async function fetchAdminDashboard() {
  const [health, plans, stats] = await Promise.all([
    fetchHealth(),
    fetchPlans(),
    safe(() => fetchAdminStats()),
  ]);
  return { health, plans, stats };
}
