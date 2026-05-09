import { apiGet, apiPost, apiPatch, ApiError } from '@/lib/api';
import { withUserCache } from '@/lib/serverCache';
import { CACHE_TAGS } from '@/lib/cacheTags';
import type { ApiResponse, Plan, AdminStats, AdminOwner, AdminOwnerDetail, AdminBusiness, AdminBusinessDetail, AdminSubscription, AdminPlan, AdminSubscriptionDetail, AdminList, ActivityLog, ActivityAction, ActivityEntityType } from '@/types/api';

export interface HealthStatus {
  status: 'ok' | 'degraded';
  checks: { database: string; cache: string };
}

export interface CreateOwnerInput {
  phone:      string;
  full_name:  string;
  email?:     string;
}

export interface CreatedOwner {
  user_id:   string;
  phone:     string;
  full_name: string;
  role:      string;
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

export interface ActivityLogParams {
  page?:        number;
  page_size?:   number;
  search?:      string;
  action?:      ActivityAction | string;
  entity_type?: ActivityEntityType | string;
  actor_id?:    string;
  from_date?:   string;
  to_date?:     string;
  [key: string]: string | number | boolean | undefined | null;
}

export interface ActivityLogList {
  count:      number;
  next:       string | null;
  previous:   string | null;
  results:    ActivityLog[];
}

async function safe<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (e) {
    // Check ApiError BEFORE 'digest' — Next.js adds digest to all thrown errors,
    // so checking digest first would re-throw 429 ApiErrors instead of suppressing them.
    if (e instanceof ApiError) {
      if (e.status === 401) throw e;
      console.error('[admin]', e.status, e.message);
      return null;
    }
    if (typeof e === 'object' && e !== null && 'digest' in e) throw e;
    console.error('[admin]', e instanceof Error ? e.message : e);
    return null;
  }
}

// ── Health ────────────────────────────────────────────────────────────────────

export async function fetchHealth(): Promise<HealthStatus | null> {
  return safe(() =>
    withUserCache(
      (tok) => apiGet<HealthStatus>('/api/v1/health/', undefined, { token: tok }),
      [CACHE_TAGS.stats, 'health'],
      60,
    )
  );
}

// ── Plans ─────────────────────────────────────────────────────────────────────

export async function fetchPlans(): Promise<Plan[]> {
  const res = await safe(() =>
    withUserCache(
      (tok) => apiGet<ApiResponse<Plan[]>>('/api/v1/subscriptions/plans/', undefined, { token: tok }),
      [CACHE_TAGS.plans],
      300,
    )
  );
  return res?.data ?? [];
}

// ── Admin stats ───────────────────────────────────────────────────────────────

export async function fetchAdminStats(): Promise<AdminStats> {
  const res = await withUserCache(
    (tok) => apiGet<ApiResponse<AdminStats>>('/api/v1/admin/stats/', undefined, { token: tok }),
    [CACHE_TAGS.stats],
    60,
  );
  if (!res) throw new Error('[admin] stats unavailable');
  return res.data;
}

// ── Admin owners list ─────────────────────────────────────────────────────────

export async function fetchAdminOwners(params?: AdminListParams): Promise<AdminList<AdminOwner>['data']> {
  const res = await withUserCache(
    (tok) => apiGet<AdminList<AdminOwner>>('/api/v1/admin/owners/', params as Record<string, string>, { token: tok }),
    [CACHE_TAGS.owners, JSON.stringify(params ?? {})],
    120,
  );
  if (!res) throw new Error('[admin] owners unavailable');
  return res.data;
}

// ── Admin businesses list ─────────────────────────────────────────────────────

export async function fetchAdminBusinesses(params?: AdminListParams): Promise<AdminList<AdminBusiness>['data']> {
  const res = await withUserCache(
    (tok) => apiGet<AdminList<AdminBusiness>>('/api/v1/admin/businesses/', params as Record<string, string>, { token: tok }),
    [CACHE_TAGS.businesses, JSON.stringify(params ?? {})],
    120,
  );
  if (!res) throw new Error('[admin] businesses unavailable');
  return res.data;
}

// ── Admin business detail ─────────────────────────────────────────────────────

export interface CreateBusinessInput {
  owner_phone: string;
  name:        string;
  address?:    string;
  phone?:      string;
  email?:      string;
}

export async function fetchAdminBusiness(id: string): Promise<AdminBusinessDetail> {
  const res = await withUserCache(
    (tok) => apiGet<ApiResponse<AdminBusinessDetail>>(`/api/v1/admin/businesses/${id}/`, undefined, { token: tok }),
    [CACHE_TAGS.businesses, id],
    120,
  );
  if (!res) throw new Error('[admin] business unavailable');
  return res.data;
}

export async function updateAdminBusiness(
  id:   string,
  data: { name?: string; address?: string; phone?: string; email?: string },
): Promise<AdminBusinessDetail> {
  const res = await apiPatch<ApiResponse<AdminBusinessDetail>>(`/api/v1/admin/businesses/${id}/`, data);
  return res.data;
}

export async function toggleAdminBusinessStatus(id: string): Promise<{ id: string; is_active: boolean }> {
  const res = await apiPost<ApiResponse<{ id: string; is_active: boolean }>>(
    `/api/v1/admin/businesses/${id}/toggle-status/`, {},
  );
  return res.data;
}

export async function createAdminBusiness(input: CreateBusinessInput): Promise<AdminBusinessDetail> {
  const res = await apiPost<ApiResponse<AdminBusinessDetail>>('/api/v1/admin/businesses/create/', input);
  return res.data;
}

// ── Admin subscriptions list ──────────────────────────────────────────────────

export async function fetchAdminSubscriptions(params?: AdminListParams): Promise<AdminList<AdminSubscription>['data']> {
  const res = await withUserCache(
    (tok) => apiGet<AdminList<AdminSubscription>>('/api/v1/admin/subscriptions/', params as Record<string, string>, { token: tok }),
    [CACHE_TAGS.subscriptions, JSON.stringify(params ?? {})],
    120,
  );
  if (!res) throw new Error('[admin] subscriptions unavailable');
  return res.data;
}

// ── Admin plans ───────────────────────────────────────────────────────────────

export async function fetchAdminPlans(): Promise<AdminPlan[]> {
  const res = await withUserCache(
    (tok) => apiGet<{ success: boolean; data: AdminPlan[] }>('/api/v1/admin/plans/', undefined, { token: tok }),
    [CACHE_TAGS.plans, 'admin'],
    300,
  );
  if (!res) throw new Error('[admin] plans unavailable');
  return res.data;
}

export async function fetchAdminPlan(id: string): Promise<AdminPlan> {
  const res = await withUserCache(
    (tok) => apiGet<ApiResponse<AdminPlan>>(`/api/v1/admin/plans/${id}/`, undefined, { token: tok }),
    [CACHE_TAGS.plans, id],
    300,
  );
  if (!res) throw new Error('[admin] plan unavailable');
  return res.data;
}

export interface PlanInput {
  name:           string;
  description?:   string;
  price:          string;
  currency?:      string;
  max_shops?:     number;
  max_products?:  number;
  max_users?:     number;
  duration_days?: number;
  features?:      Record<string, unknown>;
  is_active?:     boolean;
  sort_order?:    number;
}

export async function createAdminPlan(input: PlanInput): Promise<AdminPlan> {
  const res = await apiPost<ApiResponse<AdminPlan>>('/api/v1/admin/plans/create/', input);
  return res.data;
}

export async function updateAdminPlan(id: string, input: Partial<PlanInput>): Promise<AdminPlan> {
  const res = await apiPatch<ApiResponse<AdminPlan>>(`/api/v1/admin/plans/${id}/`, input);
  return res.data;
}

export async function toggleAdminPlanActive(id: string): Promise<{ id: string; is_active: boolean }> {
  const res = await apiPost<ApiResponse<{ id: string; is_active: boolean }>>(
    `/api/v1/admin/plans/${id}/toggle-active/`, {},
  );
  return res.data;
}

// ── Admin subscription detail ─────────────────────────────────────────────────

export async function fetchAdminSubscription(id: string): Promise<AdminSubscriptionDetail> {
  const res = await withUserCache(
    (tok) => apiGet<ApiResponse<AdminSubscriptionDetail>>(`/api/v1/admin/subscriptions/${id}/`, undefined, { token: tok }),
    [CACHE_TAGS.subscriptions, id],
    120,
  );
  if (!res) throw new Error('[admin] subscription unavailable');
  return res.data;
}

export async function updateAdminSubscription(
  id:   string,
  data: { payment_reference?: string; notes?: string },
): Promise<AdminSubscriptionDetail> {
  const res = await apiPatch<ApiResponse<AdminSubscriptionDetail>>(`/api/v1/admin/subscriptions/${id}/`, data);
  return res.data;
}

export async function deactivateAdminSubscription(id: string): Promise<{ id: string; is_active: boolean }> {
  const res = await apiPost<ApiResponse<{ id: string; is_active: boolean }>>(
    `/api/v1/admin/subscriptions/${id}/deactivate/`, {},
  );
  return res.data;
}

export interface CreateSubscriptionInput {
  business_id:        string;
  plan_id:            string;
  start_date:         string;
  payment_reference?: string;
  notes?:             string;
}

export async function createAdminSubscription(input: CreateSubscriptionInput): Promise<AdminSubscriptionDetail> {
  const res = await apiPost<ApiResponse<AdminSubscriptionDetail>>('/api/v1/admin/subscriptions/create/', input);
  return res.data;
}

// ── Admin owner detail ────────────────────────────────────────────────────────

export async function fetchAdminOwner(id: string): Promise<AdminOwnerDetail> {
  const res = await withUserCache(
    (tok) => apiGet<ApiResponse<AdminOwnerDetail>>(`/api/v1/admin/owners/${id}/`, undefined, { token: tok }),
    [CACHE_TAGS.owners, id],
    120,
  );
  if (!res) throw new Error('[admin] owner unavailable');
  return res.data;
}

export async function updateAdminOwner(
  id:   string,
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

// ── Activity Logs ─────────────────────────────────────────────────────────────

export async function fetchActivityLogs(
  params: ActivityLogParams = {},
): Promise<ActivityLogList | null> {
  return safe(() =>
    withUserCache(
      (tok) => apiGet<{ success: boolean; data: ActivityLogList }>(
        '/api/v1/admin/activity-logs/', params, { token: tok },
      ).then((r) => r.data),
      [CACHE_TAGS.activityLogs, JSON.stringify(params)],
      30,
    )
  );
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
