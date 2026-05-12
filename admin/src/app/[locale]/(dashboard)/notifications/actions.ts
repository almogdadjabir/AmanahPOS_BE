'use server';

import { apiGet } from '@/lib/api';
import * as svc from '@/services/notifications';
import type { TemplateParams, LogParams } from '@/services/notifications';

export async function fetchAdminTemplates(p?: TemplateParams)        { return svc.fetchAdminTemplates(p); }
export async function fetchAdminDeliveryLogs(p?: LogParams)          { return svc.fetchAdminDeliveryLogs(p); }
export async function toggleAdminTemplate(id: string)                { return svc.toggleAdminTemplate(id); }
export async function deleteAdminTemplate(id: string)                { return svc.deleteAdminTemplate(id); }
export async function adminSendPush(input: svc.SendPushInput)        { return svc.adminSendPush(input); }
export async function adminSendSMS(input: svc.SendSMSInput)          { return svc.adminSendSMS(input); }

interface UserOption { id: string; full_name: string; phone: string; role: string }

export async function searchOwnersAction(query: string): Promise<UserOption[]> {
  const res = await apiGet<{ success: boolean; data: { results: UserOption[] } }>(
    '/api/v1/admin/owners/',
    { search: query, page_size: '10' },
  );
  return res.data?.results ?? [];
}
