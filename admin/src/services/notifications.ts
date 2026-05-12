import { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';
import { withUserCache } from '@/lib/serverCache';
import { CACHE_TAGS } from '@/lib/cacheTags';
import type {
  ApiResponse, DeliveryLog, NotificationSetting, NotificationTemplate,
} from '@/types/api';

interface PagedResult<T> {
  count:    number;
  next:     string | null;
  previous: string | null;
  results:  T[];
}

export interface TemplateParams {
  page?:      number;
  page_size?: number;
  search?:    string;
  category?:  string;
  channel?:   string;
  enabled?:   string;
}

export interface LogParams {
  page?:      number;
  page_size?: number;
  channel?:   string;
  status?:    string;
  from_date?: string;
  to_date?:   string;
  search?:    string;
}

// ── Templates ─────────────────────────────────────────────────────────────────

export async function fetchAdminTemplates(
  params?: TemplateParams,
): Promise<PagedResult<NotificationTemplate>> {
  const res = await withUserCache(
    (tok) =>
      apiGet<PagedResult<NotificationTemplate>>(
        '/api/v1/admin/notifications/templates/',
        params as Record<string, string>,
        { token: tok },
      ),
    [CACHE_TAGS.notifications, 'templates', JSON.stringify(params ?? {})],
    30,
  );
  return res ?? { count: 0, next: null, previous: null, results: [] };
}

export async function fetchAdminTemplate(id: string): Promise<NotificationTemplate | null> {
  const res = await withUserCache(
    (tok) =>
      apiGet<ApiResponse<NotificationTemplate>>(
        `/api/v1/admin/notifications/templates/${id}/`,
        undefined,
        { token: tok },
      ),
    [CACHE_TAGS.notifications, 'template', id],
    30,
  );
  return res?.data ?? null;
}

export interface TemplateInput {
  key:        string;
  name:       string;
  category:   string;
  channel:    string;
  title_en:   string;
  body_en:    string;
  title_ar:   string;
  body_ar:    string;
  variables:  string[];
  is_enabled: boolean;
}

export async function createAdminTemplate(input: TemplateInput): Promise<NotificationTemplate> {
  const res = await apiPost<ApiResponse<NotificationTemplate>>(
    '/api/v1/admin/notifications/templates/',
    input,
  );
  return res.data;
}

export async function updateAdminTemplate(
  id: string,
  input: Partial<TemplateInput>,
): Promise<NotificationTemplate> {
  const res = await apiPatch<ApiResponse<NotificationTemplate>>(
    `/api/v1/admin/notifications/templates/${id}/`,
    input,
  );
  return res.data;
}

export async function deleteAdminTemplate(id: string): Promise<void> {
  await apiDelete<{ success: boolean }>(`/api/v1/admin/notifications/templates/${id}/`);
}

export async function toggleAdminTemplate(
  id: string,
): Promise<{ id: string; is_enabled: boolean }> {
  const res = await apiPost<ApiResponse<{ id: string; is_enabled: boolean }>>(
    `/api/v1/admin/notifications/templates/${id}/toggle/`,
    {},
  );
  return res.data;
}

// ── Settings ──────────────────────────────────────────────────────────────────

export async function fetchAdminNotifSettings(): Promise<NotificationSetting[]> {
  const res = await withUserCache(
    (tok) =>
      apiGet<ApiResponse<NotificationSetting[]>>(
        '/api/v1/admin/notifications/settings/',
        undefined,
        { token: tok },
      ),
    [CACHE_TAGS.notifications, 'settings'],
    30,
  );
  return res?.data ?? [];
}

export async function updateAdminNotifSettings(
  updates: { key: string; value: string }[],
): Promise<NotificationSetting[]> {
  const res = await apiPatch<ApiResponse<NotificationSetting[]>>(
    '/api/v1/admin/notifications/settings/',
    { updates },
  );
  return res.data;
}

// ── Manual send ───────────────────────────────────────────────────────────────

export interface SendPushInput {
  user_id:      string;
  title?:       string;
  body?:        string;
  template_id?: string;
}

export interface SendPushResult {
  device_count:    number;
  notification_id: string;
}

export async function adminSendPush(input: SendPushInput): Promise<SendPushResult> {
  const res = await apiPost<ApiResponse<SendPushResult>>(
    '/api/v1/admin/notifications/send/push/',
    input,
  );
  return res.data;
}

export interface SendSMSInput {
  user_id:      string;
  message?:     string;
  template_id?: string;
}

export async function adminSendSMS(input: SendSMSInput): Promise<{ message: string }> {
  const res = await apiPost<ApiResponse<{ message: string }>>(
    '/api/v1/admin/notifications/send/sms/',
    input,
  );
  return res.data;
}

// ── Delivery logs ─────────────────────────────────────────────────────────────

export async function fetchAdminDeliveryLogs(
  params?: LogParams,
): Promise<PagedResult<DeliveryLog>> {
  const res = await withUserCache(
    (tok) =>
      apiGet<PagedResult<DeliveryLog>>(
        '/api/v1/admin/notifications/logs/',
        params as Record<string, string>,
        { token: tok },
      ),
    [CACHE_TAGS.notifications, 'logs', JSON.stringify(params ?? {})],
    15,
  );
  return res ?? { count: 0, next: null, previous: null, results: [] };
}
