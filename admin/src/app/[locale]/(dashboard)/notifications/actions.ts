'use server';

import { apiGet } from '@/lib/api';
import * as svc from '@/services/notifications';
import type {
  TemplateParams, LogParams,
  SendPushInput, SendSMSInput, TemplateInput,
} from '@/services/notifications';

export async function fetchAdminTemplates(p?: TemplateParams)                             { return svc.fetchAdminTemplates(p); }
export async function fetchAdminTemplate(id: string)                                       { return svc.fetchAdminTemplate(id); }
export async function fetchAdminDeliveryLogs(p?: LogParams)                                { return svc.fetchAdminDeliveryLogs(p); }
export async function fetchAdminNotifSettings()                                             { return svc.fetchAdminNotifSettings(); }
export async function toggleAdminTemplate(id: string)                                      { return svc.toggleAdminTemplate(id); }
export async function deleteAdminTemplate(id: string)                                      { return svc.deleteAdminTemplate(id); }
export async function createAdminTemplate(input: TemplateInput)                            { return svc.createAdminTemplate(input); }
export async function updateAdminTemplate(id: string, input: Partial<TemplateInput>)       { return svc.updateAdminTemplate(id, input); }
export async function adminSendPush(input: SendPushInput)                                  { return svc.adminSendPush(input); }
export async function adminSendSMS(input: SendSMSInput)                                    { return svc.adminSendSMS(input); }
export async function updateAdminNotifSettings(updates: { key: string; value: string }[]) { return svc.updateAdminNotifSettings(updates); }

interface UserOption { id: string; full_name: string; phone: string; role: string }

export async function searchOwnersAction(query: string): Promise<UserOption[]> {
  const res = await apiGet<{ success: boolean; data: { results: UserOption[] } }>(
    '/api/v1/admin/owners/',
    { search: query, page_size: '10' },
  );
  return res.data?.results ?? [];
}
