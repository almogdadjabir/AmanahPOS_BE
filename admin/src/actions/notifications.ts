'use server';

import { apiPost, apiPatch } from '@/lib/api';
import type { ApiResponse, NotificationSetting, NotificationTemplate } from '@/types/api';

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

export async function updateAdminNotifSettings(
  updates: { key: string; value: string }[],
): Promise<NotificationSetting[]> {
  const res = await apiPatch<ApiResponse<NotificationSetting[]>>(
    '/api/v1/admin/notifications/settings/',
    { updates },
  );
  return res.data;
}
