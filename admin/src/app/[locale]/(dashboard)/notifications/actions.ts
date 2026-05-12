'use server';

import { apiGet } from '@/lib/api';

export {
  fetchAdminTemplates,
  fetchAdminDeliveryLogs,
  toggleAdminTemplate,
  deleteAdminTemplate,
  adminSendPush,
  adminSendSMS,
} from '@/services/notifications';

interface UserOption { id: string; full_name: string; phone: string; role: string }

export async function searchOwnersAction(query: string): Promise<UserOption[]> {
  const res = await apiGet<{ success: boolean; data: { results: UserOption[] } }>(
    '/api/v1/admin/owners/',
    { search: query, page_size: '10' },
  );
  return res.data?.results ?? [];
}
